import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event, BotSession } from '../types'
import { saveSession } from '~~/server/repositories/botSessionRepository'
import { saveStockCountItems } from '~~/server/repositories/stock-count-repository'
import { parseTieredQty } from '~~/server/utils/parseTieredQty'
import { sendMessage } from '~~/server/services/telegramService'
import { loadItems, fetchTiers, fmtNum, nextUncounted, tierExample, tierLabels } from './helpers'
import { showCurrentItem } from './present'

// A physical count for the current item: tiered text → base → save + advance.
export async function recordCurrent(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
  text: string,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const current = ctx.cursor_item_id ? items.find((i) => i.id === ctx.cursor_item_id) : null
  if (!current) {
    await showCurrentItem(event, session, chatId, client)
    return
  }
  const tiers = await fetchTiers(event, client, current.ingredient_id)
  const r = parseTieredQty(text, tiers)
  if (r.base === null) {
    const ex = tierExample(tiers)
    let m = `⚠️ ${r.error ?? 'jumlah tidak valid'}.\n`
    m += `Satuan tersedia untuk <b>${current.name}</b>: ${tierLabels(tiers)}.\n`
    m += ex
      ? `Contoh: <code>${ex}</code> atau <code>4500</code>.`
      : `Contoh: <code>4500</code> (${current.base_unit}).`
    m += `\n<i>Tambah satuan lain (mis. karton/pcs) di web → Bahan → Satuan.</i>`
    await sendMessage(chatId, m)
    return
  }
  await saveStockCountItems(event, [{ item_id: current.id, counted_qty: r.base }], client)
  ctx.cursor_item_id = current.id
  await saveSession(event, session)
  await showCurrentItem(event, session, chatId, client, `✅ ${current.name}: ${fmtNum(r.base)} ${current.base_unit}`)
}

// Leave the current item un-counted and move to the next un-counted one.
export async function skipCurrent(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const currentId = ctx.cursor_item_id
  const next = nextUncounted(items, currentId)
  if (!next) {
    await showCurrentItem(event, session, chatId, client)
    return
  }
  if (next.id === currentId) {
    const cur = items.find((i) => i.id === currentId)
    await sendMessage(chatId, `Tinggal <b>${cur?.name ?? 'ini'}</b> yang belum dihitung. Ketik jumlah, atau /selesai untuk skip sisanya.`)
    return
  }
  const cur = items.find((i) => i.id === currentId)
  ctx.cursor_item_id = next.id
  await saveSession(event, session)
  await showCurrentItem(event, session, chatId, client, cur ? `⏭ ${cur.name} di-skip (bisa dihitung lagi nanti).` : undefined)
}
