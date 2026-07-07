import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event, BotSession } from '../types'
import { saveSession, clearSession } from '~~/server/repositories/botSessionRepository'
import { finalizeAreaOpname, getAreaVarianceSummary } from '~~/server/services/stock-count-service'
import { sendMessage, opnameFinalizeKeyboard } from '~~/server/services/telegramService'
import { formatRupiah } from '~~/server/utils/formatRupiah'
import { loadItems, fmtNum } from './helpers'

// /selesai — warn if lines are still un-counted, else finalize straight away.
export async function startFinalize(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const remaining = items.filter((i) => !i.counted).length
  if (remaining > 0) {
    session.state = 'AWAITING_OPNAME_FINALIZE'
    await saveSession(event, session)
    await sendMessage(
      chatId,
      `⚠️ <b>${remaining}</b> item belum dihitung — akan di-skip (tidak masuk perhitungan konsumsi). Tetap finalisasi opname ${ctx.area_label}?`,
      opnameFinalizeKeyboard(),
    )
    return
  }
  await doFinalize(event, session, chatId, client)
}

export async function doFinalize(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
): Promise<void> {
  const ctx = session.context!.opname!
  const pending = ctx.pending_new ?? []
  const res = await finalizeAreaOpname(event, ctx.stock_count_id, client)
  // Variance vs sales — only surfaces if period_sales were imported/entered for this session.
  const variance = await getAreaVarianceSummary(event, ctx.stock_count_id, client, 5)
  await clearSession(event, session.telegram_user_id)

  let msg = `✅ <b>Opname ${ctx.area_label} selesai.</b>\n`
  msg += `💰 Total nilai stok: <b>${formatRupiah(res.total_value)}</b>\n`
  msg += `Dihitung: ${res.counted} · Di-skip: ${res.skipped}`
  if (variance.has_sales) {
    const boros = variance.top.filter((v) => v.variance_qty > 0).slice(0, 3)
    if (boros.length) {
      const list = boros
        .map((v) => `• ${v.name}: +${fmtNum(v.variance_qty)} ${v.base_unit} (${formatRupiah(v.variance_value)})`)
        .join('\n')
      msg += `\n\n🔺 <b>Paling boros (pemakaian vs penjualan):</b>\n${list}`
    }
  }
  if (pending.length) {
    const list = pending.map((p) => `• ${p.name}${p.qty != null ? ` (${fmtNum(p.qty)})` : ''}`).join('\n')
    msg += `\n\n🆕 <b>Temuan baru (belum ada di web):</b>\n${list}`
    msg += `\n<i>Tambahkan di web app (menu Bahan) beserta harga & kemasan.</i>`
  }
  await sendMessage(chatId, msg)
}
