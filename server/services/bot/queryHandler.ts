import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from './types'
import { getAllWallets } from '~~/server/repositories/walletRepository'
import { sumByTypeAndDateRange } from '~~/server/repositories/transactionRepository'
import { sendMessage } from '~~/server/services/telegramService'
import { formatRupiah } from '~~/server/utils/formatRupiah'

export async function handleQuery(event: H3Event, chatId: number, text: string): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const lower = text.toLowerCase()

  if (lower.includes('saldo') || lower.includes('balance')) {
    const wallets = await getAllWallets(event, client)
    const total = wallets.reduce((sum, w) => sum + w.balance, 0)
    const walletIcons: Record<string, string> = {
      Cash: '💵', Rekening: '🏦', GoPay: '💚', ShopeePay: '🧡',
    }
    const lines = wallets.map(w =>
      `${walletIcons[w.name] ?? '💳'} ${w.name}: ${formatRupiah(w.balance)}`,
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
