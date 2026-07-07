import { timingSafeEqual } from 'node:crypto'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, AppUser, BotSession } from './types'
import {
  saveSession,
  clearSession,
} from '~~/server/repositories/botSessionRepository'
import { getAllWallets, findWalletByName } from '~~/server/repositories/walletRepository'
import { getCategories, findCategoryByName, getCategoryById } from '~~/server/repositories/categoryRepository'
import { parseTransaction } from '~~/server/services/geminiService'
import {
  sendMessage,
  categoryKeyboard,
  smartConfirmKeyboard,
  disambiguationKeyboard,
} from '~~/server/services/telegramService'
import { parseAmount } from '~~/server/utils/parseAmount'
import { matchIngredient } from '~~/server/services/ingredient-match-service'
import { handleQuery } from './queryHandler'
import { startRestockFlow, handleRestockQtyInput, finalizeRestock } from './restockHandler'
import { startOrderTagFlow } from './orderHandler'
import { startAreaOpname, handleOpnameText } from './opname'
import {
  HELP_TEXT,
  geminiErrorMessage,
  buildContext,
  parseDate,
  checkSmartLearning,
  sendConfirmationMessage,
  saveTransactionFromSession,
  updateSmartLearning,
  handleAddCategory,
  todayIso,
} from './utils'

export async function handleTextMessage(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  if (text === '/help' || text === '/start') {
    await sendMessage(chatId, HELP_TEXT)
    return
  }

  // Opname commands start/resume an area count from ANY state (explicit switch wins).
  // Normalize first: strip a @botname suffix (groups) + lowercase, so
  // "/Opname-Kitchen@zen_stagging" resolves too.
  const opnameCmd = text.trim().toLowerCase().split('@')[0] ?? ''
  if (opnameCmd === '/opname-kitchen') {
    await startAreaOpname(event, user, session, chatId, 'kitchen')
    return
  }
  if (opnameCmd === '/opname-bar') {
    await startAreaOpname(event, user, session, chatId, 'bar')
    return
  }
  // Typo or bare /opname* → a helpful hint instead of the generic "tidak paham".
  if (opnameCmd.startsWith('/opname')) {
    await sendMessage(chatId, 'Perintah opname: <b>/opname-kitchen</b> (dapur) atau <b>/opname-bar</b>.')
    return
  }

  // While a count is active, route everything (incl. its own /batal, /selesai) to the
  // opname handler — before the generic /batal so pausing keeps the resumable draft.
  if (session.state.startsWith('AWAITING_OPNAME')) {
    await handleOpnameText(event, session, chatId, text)
    return
  }

  if (text === '/batal') {
    await clearSession(event, session.telegram_user_id)
    await sendMessage(chatId, '✅ Dibatalkan. Ketik pesan baru untuk mulai transaksi baru.')
    return
  }

  if (text === '/pesanan') {
    const client = serverSupabaseServiceRole(event)
    await startOrderTagFlow(event, chatId, client)
    return
  }

  if (session.state === 'AWAITING_ORDER_TX') {
    await handleOrderTxInput(event, user, session, chatId, text)
    return
  }

  if (session.state === 'AWAITING_PIN') {
    await handlePinInput(event, user, session, chatId, text)
    return
  }

  if (session.state === 'AWAITING_EDIT_VALUE') {
    await handleEditValue(event, session, chatId, text)
    return
  }

  if (session.state === 'AWAITING_RESTOCK_QTY') {
    await handleRestockQtyInput(event, session, chatId, text)
    return
  }

  if (session.state !== 'IDLE') {
    await sendMessage(
      chatId,
      '⚠️ Kamu masih punya transaksi yang belum selesai. Selesaikan dulu atau tap Batal.',
    )
    if (session.context) {
      if (session.state === 'AWAITING_SMART_CONFIRM' && session.context.category_id) {
        const client = serverSupabaseServiceRole(event)
        const categoryRecord = await getCategoryById(event, session.context.category_id, client)
        const label = session.context.item ?? 'item ini'
        await sendMessage(
          chatId,
          `Masukkan "${label}" ke kategori ${categoryRecord.name}?`,
          smartConfirmKeyboard(categoryRecord.name),
        )
      } else {
        await sendConfirmationMessage(event, chatId, session.context)
      }
    }
    return
  }

  const categoryMatch = text.match(/^kategori\s+(pengeluaran\s+|pemasukan\s+)?baru[:\s]+(.+)$/i)
  if (categoryMatch) {
    await handleAddCategory(event, chatId, categoryMatch)
    return
  }

  const parsed = await parseTransaction(event, text)

  switch (parsed.type) {
    case 'error':
      await sendMessage(chatId, geminiErrorMessage(parsed.errorKind))
      return

    case 'unknown':
      await sendMessage(
        chatId,
        'Maaf, tidak bisa memahami pesanmu.\n\nContoh:\n• beli gula 15k\n• gopay masuk 150k\n• pindah gopay ke rekening 500k\n• saldo sekarang?',
      )
      return

    case 'query':
      await handleQuery(event, chatId, text)
      return

    case 'expense':
    case 'income':
    case 'transfer':
      await handleTransactionInput(event, user, session, chatId, {
        type: parsed.type,
        amount: parsed.amount,
        wallet: parsed.wallet,
        wallet_to: parsed.wallet_to,
        category: parsed.category,
        item: parsed.item,
        qty_value: parsed.qty_value,
        qty_unit: parsed.qty_unit,
      })
      return
  }
}

async function handleTransactionInput(
  event: H3Event,
  _user: AppUser,
  session: BotSession,
  chatId: number,
  parsed: {
    type: 'expense' | 'income' | 'transfer'
    amount: number | null
    wallet: string | null
    wallet_to: string | null
    category: string | null
    item: string | null
    qty_value: number | null
    qty_unit: 'package' | 'base' | null
  },
  customOrderId: string | null = null,
  customOrderLabel: string | null = null,
): Promise<void> {
  const client = serverSupabaseServiceRole(event)

  if (parsed.amount === null) {
    await sendMessage(chatId, 'Nominalnya berapa?')
    return
  }

  if (parsed.type === 'transfer' && (!parsed.wallet || !parsed.wallet_to)) {
    await sendMessage(chatId, 'Transfer dari wallet mana ke wallet mana?\n\nContoh: pindah cash ke rekening 500k')
    return
  }

  const walletRecord = parsed.wallet
    ? await findWalletByName(event, parsed.wallet, client)
    : null
  const walletToRecord = parsed.wallet_to
    ? await findWalletByName(event, parsed.wallet_to, client)
    : null

  const walletId = walletRecord?.id ?? null
  const walletToId = walletToRecord?.id ?? null

  if (parsed.type === 'transfer' && (!walletId || !walletToId)) {
    await sendMessage(chatId, 'Wallet tidak ditemukan. Pilihan: Cash, Rekening, GoPay, ShopeePay')
    return
  }

  // Sprint 12 — an ingredient purchase becomes a restock (piggybacks the expense flow).
  // Skipped when tagging a custom order: those costs are one-off, must NOT touch the
  // ingredient master or restock/stock-opname (they just tag as a plain expense).
  if (!customOrderId && parsed.type === 'expense' && parsed.item) {
    const match = await matchIngredient(event, parsed.item, client)
    if (match.verdict === 'exact' || match.verdict === 'near') {
      let restockWalletId = walletId
      if (!restockWalletId) {
        const wallets = await getAllWallets(event, client)
        restockWalletId = wallets[0]?.id ?? null
      }
      if (!restockWalletId) {
        await sendMessage(chatId, 'Wallet tidak ditemukan. Pilihan: Cash, Rekening, GoPay, ShopeePay')
        return
      }

      if (match.verdict === 'exact') {
        const ing = match.candidates[0]!
        await startRestockFlow(event, session, chatId, {
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          base_unit: ing.base_unit,
          total_cost: parsed.amount,
          wallet_id: restockWalletId,
          qty_value: parsed.qty_value,
          qty_unit: parsed.qty_unit,
        })
        return
      }

      // near-match → ask which ingredient (never silently create a duplicate)
      session.state = 'AWAITING_DISAMBIGUATION'
      session.context = {
        type: 'expense',
        amount: parsed.amount,
        wallet_id: restockWalletId,
        wallet_to_id: null,
        category_id: null,
        item: parsed.item,
        note: null,
        date: todayIso(),
        pin_attempts: 0,
        editing_field: null,
        kind: 'restock',
        total_cost: parsed.amount,
        qty_value: parsed.qty_value,
        qty_unit: parsed.qty_unit,
        candidates: match.candidates.map((c) => ({ id: c.id, name: c.name })),
      }
      await saveSession(event, session)
      await sendMessage(
        chatId,
        `"${parsed.item}" bukan nama bahan yang persis. Maksud kamu?`,
        disambiguationKeyboard(match.candidates),
      )
      return
    }
    // verdict 'none' → fall through to the normal expense flow
  }

  let categoryId: string | null = null
  if (parsed.type !== 'transfer') {
    if (parsed.category) {
      const categoryRecord = await findCategoryByName(event, parsed.category, parsed.type, client)
      categoryId = categoryRecord?.id ?? null
    }

    if (!categoryId && parsed.item) {
      const learned = await checkSmartLearning(event, parsed.item)
      if (learned) {
        const categoryRecord = await getCategoryById(event, learned.category_id, client)
        session.state = 'AWAITING_SMART_CONFIRM'
        session.context = buildContext(parsed, walletId, walletToId, learned.category_id, customOrderId, customOrderLabel)
        await saveSession(event, session)
        const label = parsed.item ?? 'item ini'
        await sendMessage(
          chatId,
          `Masukkan "${label}" ke kategori ${categoryRecord.name}?`,
          smartConfirmKeyboard(categoryRecord.name),
        )
        return
      }
    }

    if (!categoryId) {
      const categories = await getCategories(event, parsed.type, client)
      if (categories.length === 0) {
        await sendMessage(chatId, '⚠️ Belum ada kategori. Tambah kategori dulu di web app.')
        return
      }

      session.state = 'AWAITING_CATEGORY_SELECTION'
      session.context = buildContext(parsed, walletId, walletToId, null, customOrderId, customOrderLabel)
      await saveSession(event, session)

      const label = parsed.item ?? 'transaksi ini'
      await sendMessage(
        chatId,
        `Pilih kategori untuk "${label}":`,
        categoryKeyboard(categories),
      )
      return
    }
  }

  if (!walletId && parsed.type !== 'transfer') {
    const wallets = await getAllWallets(event, client)
    const defaultWallet = wallets[0]
    if (defaultWallet) {
      session.state = 'AWAITING_CONFIRMATION'
      session.context = buildContext(parsed, defaultWallet.id, walletToId, categoryId, customOrderId, customOrderLabel)
      await saveSession(event, session)
      await sendConfirmationMessage(event, chatId, session.context)
      return
    }
  }

  if (!walletId) {
    await sendMessage(chatId, 'Wallet tidak ditemukan. Pilihan: Cash, Rekening, GoPay, ShopeePay')
    return
  }

  session.state = 'AWAITING_CONFIRMATION'
  session.context = buildContext(parsed, walletId, walletToId, categoryId, customOrderId, customOrderLabel)
  await saveSession(event, session)
  await sendConfirmationMessage(event, chatId, session.context)
}

// Owner picked a custom order via /pesanan, then typed a payment/cost. Route it through
// the normal transaction pipeline but carry the custom_order_id so the saved tx is tagged.
async function handleOrderTxInput(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  const customOrderId = session.context?.custom_order_id ?? null
  const customOrderLabel = session.context?.custom_order_label ?? null
  if (!customOrderId) {
    await clearSession(event, session.telegram_user_id)
    await sendMessage(chatId, 'Sesi pesanan hilang. Ketik /pesanan lagi.')
    return
  }

  const parsed = await parseTransaction(event, text)
  if (parsed.type === 'income' || parsed.type === 'expense') {
    await handleTransactionInput(
      event,
      user,
      session,
      chatId,
      {
        type: parsed.type,
        amount: parsed.amount,
        wallet: parsed.wallet,
        wallet_to: null,
        category: parsed.category,
        item: parsed.item,
        qty_value: null,
        qty_unit: null,
      },
      customOrderId,
      customOrderLabel,
    )
    return
  }

  // transfer / query / unknown / error can't tag an order — keep the session, re-prompt.
  await sendMessage(
    chatId,
    'Untuk pesanan, ketik <b>pembayaran</b> atau <b>biaya</b>.\nContoh: <i>gopay masuk 500k</i> atau <i>beli bahan 300k</i>\n(atau /batal)',
  )
}

// Constant-time PIN compare; also rejects when BOT_PIN is unset so a blank config
// can't be satisfied by a blank input.
function pinMatches(input: string, correct: string): boolean {
  if (!correct) return false
  const a = Buffer.from(input)
  const b = Buffer.from(correct)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function handlePinInput(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  const correctPin = useRuntimeConfig().botPin
  const attempts = (session.context?.pin_attempts ?? 0) + 1

  if (pinMatches(text.trim(), correctPin)) {
    if (session.context?.kind === 'restock') {
      await finalizeRestock(event, user, session, chatId)
    } else {
      await saveTransactionFromSession(event, user, session)
      await clearSession(event, session.telegram_user_id)
      await sendMessage(chatId, '✅ Dicatat!')
    }
    return
  }

  if (attempts >= 3) {
    await clearSession(event, session.telegram_user_id)
    await sendMessage(chatId, '❌ PIN salah 3x. Transaksi dibatalkan.')
    return
  }

  if (session.context) {
    session.context.pin_attempts = attempts
  }
  await saveSession(event, session)
  await sendMessage(chatId, `PIN salah. Sisa percobaan: ${3 - attempts}`)
}

async function handleEditValue(
  event: H3Event,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const field = session.context?.editing_field

  if (!session.context || !field) {
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    return
  }

  switch (field) {
    case 'amount': {
      const parsedAmount = parseAmount(text)
      if (parsedAmount === null) {
        await sendMessage(chatId, 'Format nominal tidak valid. Contoh: 15k, 150rb, 1jt')
        return
      }
      session.context.amount = parsedAmount
      break
    }
    case 'category': {
      const categoryRecord = await findCategoryByName(event, text, session.context.type, client)
      if (!categoryRecord) {
        await sendMessage(chatId, 'Kategori tidak ditemukan. Ketik nama kategori yang tersedia.')
        return
      }
      session.context.category_id = categoryRecord.id
      break
    }
    case 'wallet': {
      const walletRecord = await findWalletByName(event, text, client)
      if (!walletRecord) {
        await sendMessage(chatId, 'Wallet tidak ditemukan. Pilihan: Cash, Rekening, GoPay, ShopeePay')
        return
      }
      session.context.wallet_id = walletRecord.id
      break
    }
    case 'date': {
      const parsedDate = parseDate(text)
      if (!parsedDate) {
        await sendMessage(chatId, 'Format tanggal tidak valid. Contoh: kemarin, hari ini, 1 juni, 2026-06-01')
        return
      }
      session.context.date = parsedDate
      break
    }
    case 'note':
      session.context.note = text
      break
  }

  session.context.editing_field = null
  session.state = 'AWAITING_CONFIRMATION'
  await saveSession(event, session)
  await sendConfirmationMessage(event, chatId, session.context)
}

