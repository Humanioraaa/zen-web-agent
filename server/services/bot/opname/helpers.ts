import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from '../types'
import type { BotSessionContext, OpnameContext } from '~~/server/repositories/botSessionRepository'
import { getStockCountItems } from '~~/server/repositories/stock-count-repository'
import { getIngredientUnits } from '~~/server/repositories/ingredient-unit-repository'
import { todayIso } from '../utils'

export interface OpnameItem {
  id: string
  ingredient_id: string
  name: string
  base_unit: string
  counted: boolean
  counted_qty: number
  opening_qty: number | null
}

export interface TierRow {
  label: string
  factor_to_base: number
  is_base: boolean
}

// Escape user/DB text before embedding in a parse_mode=HTML Telegram message, so a
// literal '<' or '&' can't break the message (Telegram returns 400 → report lost).
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Split "nama jumlah" where the quantity is a trailing run of "<number> <unit?>" groups.
// Anchoring the qty to a number-led trailing sequence (not the FIRST digit) keeps names
// that contain digits intact, e.g. "Gula Aren 65% 3 kg" -> name "Gula Aren 65%", qty "3 kg".
// Returns qty=null when the whole string is just a name (no trailing quantity).
export function splitNameQty(line: string): { name: string; qty: string | null } {
  // Strip natural connectors first (same as parseTieredQty) so "dan"/"+"/"&" between
  // tiers doesn't cut the quantity short and push part of it into the name. NOT "," (decimal).
  const s = line.trim().replace(/\s+dan\s+/gi, ' ').replace(/\s*[+&]\s*/g, ' ').trim()
  const m = s.match(/^(.*?)\s+((?:\d[\d.,]*\s*[a-z]*\s*)+)$/i)
  if (m && m[1]!.trim() && /^\d/.test(m[2]!.trim())) {
    return { name: m[1]!.trim(), qty: m[2]!.trim() }
  }
  return { name: s, qty: null }
}

// Indonesian number format (dot thousands, comma decimals), locale-free to match
// formatRupiah and avoid ICU dependence. Up to 2 decimals, trailing zeros trimmed.
export function fmtNum(n: number): string {
  const rounded = Math.round(n * 100) / 100
  const abs = Math.abs(rounded)
  const intPart = Math.trunc(abs)
  let s = intPart.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const cents = Math.round((abs - intPart) * 100)
  if (cents > 0) s += ',' + cents.toString().padStart(2, '0').replace(/0+$/, '')
  return rounded < 0 ? `-${s}` : s
}

export function opnameBaseContext(opname: OpnameContext): BotSessionContext {
  // Transaction fields are inert for opname states; kept only to satisfy the shared
  // context shape (mirrors how order-tagging seeds placeholders).
  return {
    type: 'expense',
    amount: 0,
    wallet_id: '',
    wallet_to_id: null,
    category_id: null,
    item: null,
    note: null,
    date: todayIso(),
    pin_attempts: 0,
    editing_field: null,
    opname,
  }
}

export async function loadItems(event: H3Event, client: SupabaseClient, stockCountId: string): Promise<OpnameItem[]> {
  const rows = await getStockCountItems(event, stockCountId, client)
  const items = (rows ?? []).map((r) => {
    const ing = r.ingredients as unknown as { name: string; base_unit: string } | { name: string; base_unit: string }[] | null
    const o = Array.isArray(ing) ? ing[0] : ing
    return {
      id: r.id,
      ingredient_id: r.ingredient_id,
      name: o?.name ?? '—',
      base_unit: o?.base_unit ?? '',
      counted: r.counted,
      counted_qty: Number(r.counted_qty ?? 0),
      opening_qty: r.opening_qty === null ? null : Number(r.opening_qty),
    }
  })
  // Walk order = ingredient name (owner walks a logical path).
  items.sort((a, b) => a.name.localeCompare(b.name, 'id'))
  return items
}

export async function fetchTiers(event: H3Event, client: SupabaseClient, ingredientId: string): Promise<TierRow[]> {
  const rows = await getIngredientUnits(event, ingredientId, client)
  return (rows ?? []).map((t) => ({ label: t.label, factor_to_base: Number(t.factor_to_base), is_base: t.is_base }))
}

export function tierHint(tiers: TierRow[], baseUnit: string): string {
  const nonBase = tiers.filter((t) => !t.is_base).sort((a, b) => b.factor_to_base - a.factor_to_base)
  if (!nonBase.length) return ''
  return nonBase.map((t) => `1 ${t.label} = ${fmtNum(t.factor_to_base)} ${baseUnit}`).join(' · ')
}

// Comma list of every accepted unit label (base + tiers) for this ingredient.
export function tierLabels(tiers: TierRow[]): string {
  return tiers.map((t) => t.label).join(', ')
}

// A valid input example built from the ingredient's ACTUAL tiers (never hardcode
// "karton"/"pcs" — those only exist if the owner set them up in the Satuan UI).
export function tierExample(tiers: TierRow[]): string {
  const nb = tiers.filter((t) => !t.is_base).sort((a, b) => b.factor_to_base - a.factor_to_base)
  if (nb.length >= 2) return `3 ${nb[0]!.label} 5 ${nb[1]!.label}`
  if (nb.length === 1) return `3 ${nb[0]!.label}`
  return ''
}

// Next un-counted item after `afterId`, wrapping to the top (so skipped items come
// back around at the end). Returns the same item if it's the only one left.
export function nextUncounted(items: OpnameItem[], afterId: string | null): OpnameItem | null {
  const n = items.length
  if (n === 0) return null
  const idx = afterId ? items.findIndex((i) => i.id === afterId) : -1
  for (let k = 1; k <= n; k++) {
    const it = items[(((idx + k) % n) + n) % n]!
    if (!it.counted) return it
  }
  return null
}
