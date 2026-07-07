import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event, BotSession } from '../types'
import { saveSession } from '~~/server/repositories/botSessionRepository'
import { sendMessage } from '~~/server/services/telegramService'
import { loadItems, fetchTiers, tierHint, tierExample, nextUncounted, fmtNum, escapeHtml } from './helpers'

// Render the current item (or the "all counted" prompt). Optional ack line is prepended.
export async function showCurrentItem(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
  ackLine?: string,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const total = items.length
  const countedN = items.filter((i) => i.counted).length
  const remaining = total - countedN
  const head = ackLine ? `${ackLine}\n\n` : ''

  if (remaining === 0) {
    ctx.cursor_item_id = null
    await saveSession(event, session)
    await sendMessage(
      chatId,
      `${head}✅ Semua ${total} item terhitung.\nKetik /selesai untuk finalisasi opname ${ctx.area_label}.`,
    )
    return
  }

  // Keep the cursor if its item is still un-counted; otherwise advance past it.
  let current = ctx.cursor_item_id ? items.find((i) => i.id === ctx.cursor_item_id && !i.counted) ?? null : null
  if (!current) current = nextUncounted(items, ctx.cursor_item_id)
  if (!current) return
  ctx.cursor_item_id = current.id
  await saveSession(event, session)

  const tiers = await fetchTiers(event, client, current.ingredient_id)
  const hint = tierHint(tiers, current.base_unit)
  const opening = current.opening_qty === null
    ? 'belum ada (opname pertama)'
    : `${fmtNum(current.opening_qty)} ${current.base_unit}`

  const ex = tierExample(tiers)
  let msg = head
  msg += `🧾 <b>Opname ${ctx.area_label}</b> — ${countedN}/${total} (sisa ${remaining})\n\n`
  msg += `<b>${escapeHtml(current.name)}</b> · satuan: ${current.base_unit}\n`
  if (hint) msg += `${hint}\n`
  msg += `Stok awal (opname lalu): ${opening}\n\n`
  msg += ex
    ? `Ketik jumlah fisik (mis. <code>${ex}</code> atau <code>4500</code> ${current.base_unit}).\n`
    : `Ketik jumlah fisik dalam <b>${current.base_unit}</b> (mis. <code>4500</code>).\n`
  msg += `• <code>skip</code> lewati · <code>sisa</code> daftar sisa · /selesai · /batal`
  await sendMessage(chatId, msg)
}

export async function listRemaining(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const rem = items.filter((i) => !i.counted)
  if (!rem.length) {
    await sendMessage(chatId, '✅ Semua item sudah dihitung. Ketik /selesai.')
    return
  }
  const shown = rem.slice(0, 40).map((i) => `• ${escapeHtml(i.name)}`).join('\n')
  const more = rem.length > 40 ? `\n…dan ${rem.length - 40} lagi` : ''
  await sendMessage(chatId, `📋 <b>Sisa ${rem.length} item ${ctx.area_label}:</b>\n${shown}${more}`)
}
