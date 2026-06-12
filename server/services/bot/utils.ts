import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, BotSession, BotSessionContext, AppUser } from './types'
import { getWalletById, getAllWallets } from '~~/server/repositories/walletRepository'
import { getCategoryById, findCategoryByName, createCategory } from '~~/server/repositories/categoryRepository'
import { findByKeyword, createMemory, incrementCount } from '~~/server/repositories/itemCategoryMemoryRepository'
import {
  sendMessage,
  editMessage,
  confirmationKeyboard,
} from '~~/server/services/telegramService'
import { addTransaction } from '~~/server/services/transactionService'
import { formatRupiah } from '~~/server/utils/formatRupiah'
import type { GeminiErrorKind } from '~~/server/services/geminiService'

export const HELP_TEXT = `📖 <b>Panduan Bot Zen Coffee</b>

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

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function geminiErrorMessage(kind?: GeminiErrorKind): string {
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

export function buildContext(
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

export function parseDate(text: string): string | null {
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

export async function checkSmartLearning(
  event: H3Event,
  item: string,
): Promise<{ category_id: string; wallet_id: string | null } | null> {
  const memory = await findByKeyword(event, item)
  if (memory && memory.confirmed_count >= 2) {
    return { category_id: memory.category_id, wallet_id: memory.wallet_id }
  }
  return null
}

export async function updateSmartLearning(
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

export async function saveTransactionFromSession(
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

export async function sendConfirmationMessage(
  event: H3Event,
  chatId: number,
  context: BotSessionContext,
): Promise<void> {
  const text = await buildConfirmationText(event, context)
  await sendMessage(chatId, text, confirmationKeyboard())
}

export async function editConfirmationMessage(
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

export async function handleAddCategory(
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
