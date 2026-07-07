import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event, BotSession } from '../types'
import { saveSession } from '~~/server/repositories/botSessionRepository'
import { saveStockCountItems } from '~~/server/repositories/stock-count-repository'
import { parseTieredQty } from '~~/server/utils/parseTieredQty'
import { matchIngredient, SUGGEST_MIN } from '~~/server/services/ingredient-match-service'
import { loadItems, fetchTiers, fmtNum, escapeHtml, splitNameQty } from './helpers'
import { showCurrentItem } from './present'

// Bulk entry: a multi-line message where each line is "nama jumlah" → set many
// counts in one shot. Only confident matches (exact / a single in-area candidate)
// auto-apply; ambiguous, unknown, or malformed lines are reported for the owner to
// handle one-by-one — never silently guessed or auto-created (rule #8).
export async function handleBulkCount(
  event: H3Event,
  session: BotSession,
  chatId: number,
  client: SupabaseClient,
  text: string,
): Promise<void> {
  const ctx = session.context!.opname!
  const items = await loadItems(event, client, ctx.stock_count_id)
  const sessionIng = new Set(items.map((i) => i.ingredient_id))
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  // item_id -> counted_qty (a repeated item in one bulk = last line wins)
  const toSave = new Map<string, { qty: number; name: string; unit: string }>()
  const failed: { line: string; reason: string }[] = []

  for (const line of lines) {
    const { name, qty: qtyText } = splitNameQty(line)
    if (!qtyText) {
      failed.push({ line, reason: 'perlu format: nama jumlah' })
      continue
    }

    const match = await matchIngredient(event, name, client)
    // Only confident in-area candidates (>= the fuzzy floor) auto-apply — bulk must not
    // silently write a weak sub-threshold guess the single-line path would reject.
    const inArea = match.candidates.filter((c) => sessionIng.has(c.id) && Number(c.similarity) >= SUGGEST_MIN)
    let ingId: string | null = null
    if (match.verdict === 'exact' && sessionIng.has(match.candidates[0]!.id)) {
      ingId = match.candidates[0]!.id
    } else if (inArea.length === 1) {
      ingId = inArea[0]!.id
    } else if (inArea.length > 1) {
      failed.push({ line, reason: 'ambigu — ketik satu-satu' })
      continue
    } else {
      failed.push({ line, reason: `"${name}" tidak cocok di area ${ctx.area_label}` })
      continue
    }

    const item = items.find((i) => i.ingredient_id === ingId)!
    const tiers = await fetchTiers(event, client, item.ingredient_id)
    const r = parseTieredQty(qtyText, tiers)
    if (r.base === null) {
      failed.push({ line, reason: r.error ?? 'jumlah tidak valid' })
      continue
    }
    toSave.set(item.id, { qty: r.base, name: item.name, unit: item.base_unit })
  }

  if (toSave.size) {
    await saveStockCountItems(
      event,
      [...toSave.entries()].map(([item_id, v]) => ({ item_id, counted_qty: v.qty })),
      client,
    )
  }

  let report = ''
  if (toSave.size) {
    report += `✅ Tercatat ${toSave.size}:\n`
      + [...toSave.values()].map((v) => `• ${escapeHtml(v.name)}: ${fmtNum(v.qty)} ${v.unit}`).join('\n')
  }
  if (failed.length) {
    report += (report ? '\n\n' : '')
      + `⚠️ Gagal ${failed.length}:\n`
      + failed.map((f) => `• ${escapeHtml(f.line)} — ${escapeHtml(f.reason)}`).join('\n')
  }
  if (!report) report = 'Tidak ada baris yang bisa diproses. Format tiap baris: <code>nama jumlah</code>.'

  // Cursor unchanged — showCurrentItem re-resolves the next un-counted item (skips any
  // that this bulk just filled).
  await saveSession(event, session)
  await showCurrentItem(event, session, chatId, client, report)
}
