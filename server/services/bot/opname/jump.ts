import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event, BotSession } from '../types'
import { saveSession } from '~~/server/repositories/botSessionRepository'
import { saveStockCountItems } from '~~/server/repositories/stock-count-repository'
import { parseTieredQty } from '~~/server/utils/parseTieredQty'
import { matchIngredient } from '~~/server/services/ingredient-match-service'
import { sendMessage, opnamePendingKeyboard, opnameJumpKeyboard } from '~~/server/services/telegramService'
import { loadItems, fetchTiers, fmtNum, tierExample, tierLabels, escapeHtml, splitNameQty } from './helpers'
import { showCurrentItem } from './present'

// `[nama] [qty]` — fuzzy-match to an in-area ingredient and set its count out of order,
// or capture an unknown item as a pending find (never auto-creates an ingredient).
export async function handleJumpByName(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
  text: string,
): Promise<void> {
  const ctx = session.context!.opname!
  const { name, qty: qtyText } = splitNameQty(text)

  const items = await loadItems(event, client, ctx.stock_count_id)
  const sessionIng = new Set(items.map((i) => i.ingredient_id))
  const match = await matchIngredient(event, name, client)

  if (match.verdict === 'none') {
    // US-008: unknown → offer to record as a pending find.
    ctx.pending_name = name
    ctx.pending_qty = qtyText ? parseTieredQty(qtyText, []).base : null
    session.state = 'AWAITING_OPNAME_PENDING'
    await saveSession(event, session)
    await sendMessage(chatId, `❓ "<b>${escapeHtml(name)}</b>" tidak ada di daftar bahan. Catat sebagai <b>temuan baru</b>?`, opnamePendingKeyboard())
    return
  }

  const inArea = match.candidates.filter((c) => sessionIng.has(c.id))
  if (inArea.length === 0) {
    await sendMessage(chatId, `"${escapeHtml(name)}" bukan bahan di area ${ctx.area_label} (mungkin ada di area lain). Ketik <code>sisa</code> untuk lihat daftar.`)
    return
  }
  // Exact hit that's in this area, or a single in-area candidate → apply directly.
  if (match.verdict === 'exact' && sessionIng.has(match.candidates[0]!.id)) {
    await applyJump(event, session, chatId, client, match.candidates[0]!.id, qtyText)
    return
  }
  if (inArea.length === 1) {
    await applyJump(event, session, chatId, client, inArea[0]!.id, qtyText)
    return
  }
  // Multiple near-matches → disambiguate (stash raw qty; parse after the pick).
  ctx.jump_qty_text = qtyText
  ctx.jump_candidates = inArea.slice(0, 5).map((c) => ({ id: c.id, name: c.name }))
  session.state = 'AWAITING_OPNAME_JUMP'
  await saveSession(event, session)
  await sendMessage(chatId, 'Maksud kamu bahan yang mana?', opnameJumpKeyboard(ctx.jump_candidates))
}

export async function applyJump(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
  ingredientId: string,
  qtyText: string | null,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const item = items.find((i) => i.ingredient_id === ingredientId)
  session.state = 'AWAITING_OPNAME_COUNT'
  if (!item) {
    await saveSession(event, session)
    await sendMessage(chatId, `Bahan itu tidak ada di area ${ctx.area_label}.`)
    return
  }

  // Jump only (no qty) → focus the item and prompt. If it was already counted,
  // show its current value directly (showCurrentItem would skip a counted cursor).
  if (!qtyText) {
    ctx.cursor_item_id = item.id
    await saveSession(event, session)
    if (item.counted) {
      await sendMessage(
        chatId,
        `<b>${escapeHtml(item.name)}</b> sudah dihitung: ${fmtNum(item.counted_qty)} ${item.base_unit}.\nKetik jumlah baru untuk koreksi, atau <code>skip</code>/lanjut.`,
      )
    } else {
      await showCurrentItem(event, session, chatId, client)
    }
    return
  }
  const tiers = await fetchTiers(event, client, item.ingredient_id)
  const r = parseTieredQty(qtyText, tiers)
  if (r.base === null) {
    ctx.cursor_item_id = item.id
    await saveSession(event, session)
    const ex = tierExample(tiers)
    let m = `⚠️ ${r.error ?? 'jumlah tidak valid'} untuk <b>${escapeHtml(item.name)}</b>.\n`
    m += `Satuan tersedia: ${tierLabels(tiers)}.`
    m += ex ? ` Contoh: <code>${ex}</code> atau <code>4500</code>.` : ` Contoh: <code>4500</code>.`
    await sendMessage(chatId, m)
    return
  }
  await saveStockCountItems(event, [{ item_id: item.id, counted_qty: r.base }], client)
  ctx.cursor_item_id = item.id
  await saveSession(event, session)
  const ack = `✅ ${escapeHtml(item.name)}: ${fmtNum(r.base)} ${item.base_unit}${item.counted ? ' (diperbarui)' : ''}`
  await showCurrentItem(event, session, chatId, client, ack)
}
