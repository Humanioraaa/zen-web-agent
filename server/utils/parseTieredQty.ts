export interface TierDef {
  label: string
  factor_to_base: number
}

export interface ParseTieredResult {
  base: number | null
  error?: string
}

// Parse a tiered quantity expression into BASE units.
//   "4500"                 -> 4500              (bare number = base unit)
//   "4.5 kemasan"          -> 4.5 * factor(kemasan)
//   "3 karton 5 pcs 40 ml" -> 3*f(karton) + 5*f(pcs) + 40*f(ml)
// Unknown tier labels are rejected (so a typo doesn't silently miscount).
export function parseTieredQty(text: string, tiers: TierDef[]): ParseTieredResult {
  const norm = text.trim().toLowerCase()
  if (!norm) return { base: null, error: 'kosong' }

  const byLabel = new Map<string, number>()
  for (const t of tiers) byLabel.set(t.label.toLowerCase(), t.factor_to_base)

  const re = /(\d+(?:[.,]\d+)?)\s*([a-z]+)?/g
  let m: RegExpExecArray | null
  let base = 0
  let matched = false

  while ((m = re.exec(norm)) !== null) {
    const qty = parseFloat(m[1]!.replace(',', '.'))
    if (Number.isNaN(qty)) continue
    const label = m[2]?.trim()
    let factor: number
    if (label) {
      const f = byLabel.get(label)
      if (f === undefined) return { base: null, error: `satuan "${label}" tidak dikenal` }
      factor = f
    } else {
      factor = 1 // bare number = base unit
    }
    base += qty * factor
    matched = true
  }

  if (!matched) return { base: null, error: 'tidak ada angka' }
  if (base <= 0) return { base: null, error: 'jumlah harus lebih dari 0' }
  return { base }
}
