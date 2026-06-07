import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import type { BotSession, BotSessionContext } from '~~/server/repositories/botSessionRepository'
import {
  getOrCreateSession,
  saveSession,
  clearSession,
} from '~~/server/repositories/botSessionRepository'
import { findByTelegramId } from '~~/server/repositories/userRepository'
import { getAllWallets, findWalletByName, getWalletById } from '~~/server/repositories/walletRepository'
import { getCategories, findCategoryByName, getCategoryById, createCategory } from '~~/server/repositories/categoryRepository'
import { sumByTypeAndDateRange } from '~~/server/repositories/transactionRepository'
import { findByKeyword, createMemory, incrementCount } from '~~/server/repositories/itemCategoryMemoryRepository'
import { parseTransaction } from '~~/server/services/geminiService'
import type { GeminiErrorKind } from '~~/server/services/geminiService'
import {
  sendMessage,
  editMessage,
  answerCallbackQuery,
  confirmationKeyboard,
  categoryKeyboard,
  smartConfirmKeyboard,
} from '~~/server/services/telegramService'
import { addTransaction } from '~~/server/services/transactionService'
import { formatRupiah } from '~~/server/utils/formatRupiah'
import { parseAmount } from '~~/server/utils/parseAmount'

const HELP_TEXT = `📖 <b>Panduan Bot Zen Coffee</b>

📝 <b>Input Transaksi:</b>
• beli gula 15k
• gopay masuk 150k
• pindah cash ke rekening 500k

📊 <b>Query:</b>
• saldo
• pengeluaran hari ini?
• pemasukan bulan ini?

⚙️ <b>Lainnya:</b>
• kategori baru: Packaging
• kategori pemasukan baru: Tips

💡 <b>Tips:</b>
• Nominal: 15k, 150rb, 1jt
• PIN diperlukan untuk transaksi >Rp500.000
• /help — tampilkan panduan ini`

interface TelegramUpdate {
  message?: {
    from: { id: number }
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    from: { id: number }
    message: {
      chat: { id: number }
      message_id: number
    }
    data: string
  }
}

interface AppUser {
  id: string
  name: string
  telegram_user_id: string | null
}

export async function handleUpdate(event: H3Event, update: TelegramUpdate): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  let telegramUserId: number
  let chatId: number

  if (update.callback_query) {
    telegramUserId = update.callback_query.from.id
    chatId = update.callback_query.message.chat.id
  } else if (update.message) {
    telegramUserId = update.message.from.id
    chatId = update.message.chat.id
  } else {
    return
  }

  const user = await findByTelegramId(event, String(telegramUserId), client)
  if (!user) return

  const session = await getOrCreateSession(event, String(telegramUserId))

  if (update.callback_query) {
    await answerCallbackQuery(update.callback_query.id)
    await handleCallbackQuery(
      event,
      user as AppUser,
      session,
      chatId,
      update.callback_query.data,
      update.callback_query.message.message_id,
    )
  } else if (update.message?.text) {
    await handleTextMessage(event, user as AppUser, session, chatId, update.message.text)
  }
}

async function handleTextMessage(
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
    await handleEditValue(event, user, session, chatId, text)
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
  user: AppUser,
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

  session.state = 'AWAITING_CONFIRMATION'
  session.context = buildContext(parsed, walletId!, walletToId, categoryId)
  await saveSession(event, session)
  await sendConfirmationMessage(event, chatId, session.context)
}

async function handleCallbackQuery(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
  callbackData: string,
  messageId: number,
): Promise<void> {
  if (callbackData === 'confirm_yes' && session.state === 'AWAITING_CONFIRMATION') {
    if (session.context && session.context.amount > 500_000) {
      session.state = 'AWAITING_PIN'
      session.context.pin_attempts = 0
      await saveSession(event, session)
      await editMessage(chatId, messageId, 'Masukkan PIN untuk konfirmasi transaksi ini:')
      return
    }

    await saveTransactionFromSession(event, user, session)
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '✅ Dicatat!')
    return
  }

  if (callbackData === 'confirm_edit' && session.state === 'AWAITING_CONFIRMATION') {
    session.state = 'AWAITING_EDIT'
    await saveSession(event, session)
    await editMessage(chatId, messageId, 'Field mana yang ingin diubah?', [
      [
        { text: 'Nominal', callback_data: 'edit_amount' },
        { text: 'Kategori', callback_data: 'edit_category' },
        { text: 'Wallet', callback_data: 'edit_wallet' },
      ],
      [
        { text: 'Tanggal', callback_data: 'edit_date' },
        { text: 'Catatan', callback_data: 'edit_note' },
        { text: '❌ Batal', callback_data: 'edit_cancel' },
      ],
    ])
    return
  }

  if (callbackData === 'confirm_cancel') {
    await clearSession(event, session.telegram_user_id)
    await editMessage(chatId, messageId, '❌ Dibatalkan.')
    return
  }

  if (callbackData === 'edit_cancel' && session.state === 'AWAITING_EDIT') {
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }

  if (callbackData.startsWith('edit_') && session.state === 'AWAITING_EDIT') {
    const field = callbackData.replace('edit_', '')
    const fieldLabels: Record<string, string> = {
      amount: 'nominal',
      category: 'kategori',
      wallet: 'wallet',
      date: 'tanggal',
      note: 'catatan',
    }
    session.state = 'AWAITING_EDIT_VALUE'
    if (session.context) {
      session.context.editing_field = field
    }
    await saveSession(event, session)
    await sendMessage(chatId, `Masukkan ${fieldLabels[field] ?? field} baru:`)
    return
  }

  if (callbackData === 'smart_confirm_yes' && session.state === 'AWAITING_SMART_CONFIRM') {
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }

  if (callbackData === 'smart_choose_other' && session.state === 'AWAITING_SMART_CONFIRM') {
    const client = serverSupabaseServiceRole(event)
    if (session.context) {
      session.context.category_id = null
      const categories = await getCategories(event, session.context.type, client)
      session.state = 'AWAITING_CATEGORY_SELECTION'
      await saveSession(event, session)
      const label = session.context.item ?? 'transaksi ini'
      await editMessage(chatId, messageId, `Pilih kategori untuk "${label}":`, categoryKeyboard(categories))
    }
    return
  }

  if (callbackData.startsWith('category_') && session.state === 'AWAITING_CATEGORY_SELECTION') {
    const categoryId = callbackData.replace('category_', '')
    if (session.context) {
      session.context.category_id = categoryId
      if (session.context.item) {
        await updateSmartLearning(event, session.context.item, categoryId, session.context.wallet_id)
      }
    }
    session.state = 'AWAITING_CONFIRMATION'
    await saveSession(event, session)
    if (session.context) {
      await editConfirmationMessage(event, chatId, messageId, session.context)
    }
    return
  }
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
  user: AppUser,
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

async function handleQuery(event: H3Event, chatId: number, text: string): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const lower = text.toLowerCase()

  if (lower.includes('saldo') || lower.includes('balance')) {
    const wallets = await getAllWallets(event, client)
    const total = wallets.reduce((sum, w) => sum + Number(w.balance), 0)
    const walletIcons: Record<string, string> = {
      Cash: '💵', Rekening: '🏦', GoPay: '💚', ShopeePay: '🧡',
    }
    const lines = wallets.map(w =>
      `${walletIcons[w.name] ?? '💳'} ${w.name}: ${formatRupiah(Number(w.balance))}`,
    )
    lines.push('─────────────────')
    lines.push(`Total: ${formatRupiah(total)}`)
    await sendMessage(chatId, lines.join('\n'))
    return
  }

  const summaryRange = detectSummaryRange(lower)
  if (summaryRange) {
    const { income, expense } = await sumByTypeAndDateRange(event, summaryRange.from, summaryRange.to, client)
    const profit = income - expense
    const lines = [
      `📊 Summary ${summaryRange.label}`,
      `💰 Pemasukan:   ${formatRupiah(income)}`,
      `🛒 Pengeluaran: ${formatRupiah(expense)}`,
      '─────────────────',
      profit >= 0
        ? `✅ Profit: ${formatRupiah(profit)}`
        : `❌ Minus:  ${formatRupiah(Math.abs(profit))}`,
    ]
    await sendMessage(chatId, lines.join('\n'))
    return
  }

  await sendMessage(chatId, 'Ketik "saldo" untuk cek saldo, atau "pengeluaran hari ini?" untuk summary.')
}

function detectSummaryRange(text: string): { from: string; to: string; label: string } | null {
  const today = new Date()
  const toIso = (d: Date) => d.toISOString().slice(0, 10)

  if (text.includes('hari ini') || text.includes('today')) {
    const iso = toIso(today)
    return { from: iso, to: iso, label: 'Hari Ini' }
  }

  if (text.includes('minggu ini') || text.includes('this week')) {
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { from: toIso(monday), to: toIso(sunday), label: 'Minggu Ini' }
  }

  if (text.includes('bulan ini') || text.includes('this month')) {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { from: toIso(firstDay), to: toIso(lastDay), label: 'Bulan Ini' }
  }

  return null
}

function geminiErrorMessage(kind?: GeminiErrorKind): string {
  switch (kind) {
    case 'rate_limit':
      return '⚠️ Sistem sibuk. Coba dalam beberapa detik.'
    case 'network':
      return '⚠️ Gangguan koneksi. Coba lagi.'
    case 'parse':
      return '⚠️ Gagal memproses. Coba lagi.'
    default:
      return '⚠️ Ada kesalahan. Coba lagi.'
  }
}

async function saveTransactionFromSession(
  event: H3Event,
  user: AppUser,
  session: BotSession,
): Promise<void> {
  if (!session.context) return

  const context = session.context
  await addTransaction(event, {
    type: context.type,
    amount: context.amount,
    wallet_id: context.wallet_id,
    wallet_to_id: context.wallet_to_id ?? undefined,
    category_id: context.category_id ?? undefined,
    note: context.note ?? undefined,
    date: context.date,
    created_by: user.id,
    source: 'telegram',
  })

  if (context.item && context.category_id) {
    await updateSmartLearning(event, context.item, context.category_id, context.wallet_id)
  }
}

async function sendConfirmationMessage(
  event: H3Event,
  chatId: number,
  context: BotSessionContext,
): Promise<void> {
  const text = await buildConfirmationText(event, context)
  await sendMessage(chatId, text, confirmationKeyboard())
}

async function editConfirmationMessage(
  event: H3Event,
  chatId: number,
  messageId: number,
  context: BotSessionContext,
): Promise<void> {
  const text = await buildConfirmationText(event, context)
  await editMessage(chatId, messageId, text, confirmationKeyboard())
}

async function buildConfirmationText(event: H3Event, context: BotSessionContext): Promise<string> {
  const client = serverSupabaseServiceRole(event)
  const amountDisplay = formatRupiah(context.amount)

  if (context.type === 'transfer') {
    const walletFrom = await getWalletById(event, context.wallet_id, client)
    const walletTo = context.wallet_to_id ? await getWalletById(event, context.wallet_to_id, client) : null
    let text = `${amountDisplay}\n💸 Transfer  ${walletFrom.name} → ${walletTo?.name ?? '?'}`
    if (context.amount > 500_000) {
      text += '\n\n⚠️ Nominal besar — PIN diperlukan saat konfirmasi'
    }
    return text
  }

  const wallet = await getWalletById(event, context.wallet_id, client)
  const categoryName = context.category_id
    ? (await getCategoryById(event, context.category_id, client))?.name ?? '?'
    : '?'

  const typeIcon = context.type === 'income' ? '💰' : '🛒'
  const label = context.item ?? categoryName
  let text = `${amountDisplay} — ${label}\n${typeIcon} ${categoryName}  |  💳 ${wallet.name}`

  if (context.amount > 500_000) {
    text += '\n\n⚠️ Nominal besar — PIN diperlukan saat konfirmasi'
  }

  return text
}

async function handleAddCategory(
  event: H3Event,
  chatId: number,
  match: RegExpMatchArray,
): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const typeRaw = match[1]?.trim().toLowerCase()
  const name = match[2]!.trim()
  const type = typeRaw?.startsWith('pemasukan') ? 'income' : 'expense'

  const existing = await findCategoryByName(event, name, type, client)
  if (existing) {
    const label = type === 'income' ? 'Pemasukan' : 'Pengeluaran'
    await sendMessage(chatId, `⚠️ Kategori "${existing.name}" sudah ada di ${label}.`)
    return
  }

  await createCategory(event, { name, type }, client)
  const label = type === 'income' ? 'Pemasukan' : 'Pengeluaran'
  await sendMessage(chatId, `✅ Kategori "${name}" ditambahkan ke ${label}.`)
}

async function checkSmartLearning(
  event: H3Event,
  item: string,
): Promise<{ category_id: string; wallet_id: string | null } | null> {
  const memory = await findByKeyword(event, item)
  if (memory && memory.confirmed_count >= 2) {
    return { category_id: memory.category_id, wallet_id: memory.wallet_id }
  }
  return null
}

async function updateSmartLearning(
  event: H3Event,
  item: string | null,
  categoryId: string,
  walletId?: string | null,
): Promise<void> {
  if (!item) return
  const keyword = item.trim().toLowerCase()
  const existing = await findByKeyword(event, keyword)
  if (existing) {
    await incrementCount(event, existing.id)
  } else {
    await createMemory(event, { keyword, category_id: categoryId, wallet_id: walletId ?? null })
  }
}

function buildContext(
  parsed: {
    type: 'expense' | 'income' | 'transfer'
    amount: number | null
    item: string | null
  },
  walletId: string | null,
  walletToId: string | null,
  categoryId: string | null,
): BotSessionContext {
  return {
    type: parsed.type,
    amount: parsed.amount ?? 0,
    wallet_id: walletId ?? '',
    wallet_to_id: walletToId,
    category_id: categoryId,
    item: parsed.item,
    note: null,
    date: todayIso(),
    pin_attempts: 0,
    editing_field: null,
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseDate(text: string): string | null {
  const lower = text.trim().toLowerCase()
  const today = new Date()

  if (lower === 'hari ini' || lower === 'today') {
    return todayIso()
  }

  if (lower === 'kemarin' || lower === 'yesterday') {
    today.setDate(today.getDate() - 1)
    return today.toISOString().slice(0, 10)
  }

  const isoMatch = lower.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const date = new Date(`${isoMatch[1]!}-${isoMatch[2]!}-${isoMatch[3]!}`)
    if (!isNaN(date.getTime())) return lower
  }

  const MONTHS: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, ags: 7, agt: 7, sep: 8, okt: 9, nov: 10, des: 11,
  }

  const idMatch = lower.match(/^(\d{1,2})\s+(\w+)$/)
  if (idMatch) {
    const day = parseInt(idMatch[1]!)
    const monthName = idMatch[2]!
    const monthIndex = MONTHS[monthName]
    if (monthIndex !== undefined && day >= 1 && day <= 31) {
      const year = today.getFullYear()
      const date = new Date(year, monthIndex, day)
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10)
      }
    }
  }

  return null
}
