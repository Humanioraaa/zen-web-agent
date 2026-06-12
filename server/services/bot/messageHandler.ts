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
} from '~~/server/services/telegramService'
import { parseAmount } from '~~/server/utils/parseAmount'
import { handleQuery } from './queryHandler'
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

  if (session.state === 'AWAITING_PIN') {
    await handlePinInput(event, user, session, chatId, text)
    return
  }

  if (session.state === 'AWAITING_EDIT_VALUE') {
    await handleEditValue(event, session, chatId, text)
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
  },
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
        session.context = buildContext(parsed, walletId, walletToId, learned.category_id)
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
      session.context = buildContext(parsed, walletId, walletToId, null)
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
      session.context = buildContext(parsed, defaultWallet.id, walletToId, categoryId)
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
  session.context = buildContext(parsed, walletId, walletToId, categoryId)
  await saveSession(event, session)
  await sendConfirmationMessage(event, chatId, session.context)
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

  if (text.trim() === correctPin) {
    await saveTransactionFromSession(event, user, session)
    await clearSession(event, session.telegram_user_id)
    await sendMessage(chatId, '✅ Dicatat!')
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

