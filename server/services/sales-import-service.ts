import type { H3Event } from 'h3'
import type {
  SalesImportPreview,
  SalesImportMatchedLine,
  SalesImportUnmatchedLine,
} from '~/types/stock-count'
import { getStockCountById } from '../repositories/stock-count-repository'
import { getMenuItems } from '../repositories/menu-item-repository'
import { matchMenuItems } from '../repositories/menu-match-repository'
import { parseKpSalesJson, aggregateKpSales } from '../utils/parseKpSales'

// Trigram score at/above which a fuzzy hit is auto-suggested as matched (owner still
// reviews before saving); below → surfaced as a suggestion on an unmatched line.
const FUZZY_ACCEPT = 0.5

interface MenuMatchRow {
  id: string
  name: string
  similarity: number
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Drop a trailing variant marker so "White (Hot)" resolves to the "White" menu item.
function stripVariant(s: string): string {
  return norm(s).replace(/\s*\((iced|ice|hot|panas|dingin)\)\s*$/, '').trim()
}

// Parse + aggregate the uploaded KP files, match each product to a menu item
// (exact name → variant-stripped → trigram fuzzy), and return a review preview.
// Never writes: the owner confirms in the sales form, then saves via savePeriodSales.
export async function buildSalesImportPreview(
  event: H3Event,
  stockCountId: string,
  fileTexts: string[],
): Promise<SalesImportPreview> {
  await getStockCountById(event, stockCountId) // 404 guard

  const rows = fileTexts.flatMap((t) => parseKpSalesJson(t))
  const agg = aggregateKpSales(rows)

  const menus = (await getMenuItems(event)) ?? []
  const exact = new Map<string, { id: string; name: string }>()
  for (const m of menus) {
    if (!m.is_active) continue
    exact.set(norm(m.name), { id: m.id, name: m.name })
  }

  const matchedByMenu = new Map<string, SalesImportMatchedLine>()
  const matched: SalesImportMatchedLine[] = []
  const unmatched: SalesImportUnmatchedLine[] = []
  let totalQty = 0

  for (const it of agg) {
    totalQty += it.qty
    let hit = exact.get(norm(it.nama_barang)) ?? exact.get(stripVariant(it.nama_barang))
    let confidence: 'exact' | 'fuzzy' = 'exact'
    let similarity: number | null = null

    if (!hit) {
      const cands = (await matchMenuItems(event, stripVariant(it.nama_barang))) as MenuMatchRow[]
      const top = cands[0]
      if (top && Number(top.similarity) >= FUZZY_ACCEPT) {
        hit = { id: top.id, name: top.name }
        confidence = 'fuzzy'
        similarity = Number(top.similarity)
      } else {
        unmatched.push({
          kp_name: it.nama_barang,
          qty_sold: it.qty,
          suggestions: cands.slice(0, 3).map((c) => ({
            menu_id: c.id,
            menu_name: c.name,
            similarity: Number(c.similarity),
          })),
        })
        continue
      }
    }

    // Merge KP variants (hot/iced, duplicate codes) that resolve to one menu item.
    const existing = matchedByMenu.get(hit.id)
    if (existing) {
      existing.qty_sold += it.qty
      // If ANY contributing KP row was fuzzy, keep the merged line flagged 'fuzzy' so it
      // stays in the owner's review list — never silently upgrade a mixed line to 'exact'.
      if (confidence === 'fuzzy') {
        existing.confidence = 'fuzzy'
        existing.similarity = existing.similarity === null
          ? similarity
          : Math.min(existing.similarity, similarity ?? existing.similarity)
      }
    } else {
      const line: SalesImportMatchedLine = {
        menu_id: hit.id,
        menu_name: hit.name,
        kp_name: it.nama_barang,
        qty_sold: it.qty,
        confidence,
        similarity,
      }
      matchedByMenu.set(hit.id, line)
      matched.push(line)
    }
  }

  matched.sort((a, b) => b.qty_sold - a.qty_sold)
  unmatched.sort((a, b) => b.qty_sold - a.qty_sold)
  return { matched, unmatched, total_items: agg.length, total_qty: totalQty }
}
