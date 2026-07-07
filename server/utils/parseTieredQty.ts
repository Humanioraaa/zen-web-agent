export interface TierDef {
  label: string
  factor_to_base: number
}

export interface ParseTieredResult {
  base: number | null
  error?: string
}

// Parse an Indonesian-formatted number (dot = thousands separator, comma = decimal)
// to a Number, or null if malformed. Fixes the "4.500 read as 4,5" footgun AND
// rejects ambiguous groupings like "1.500.00" instead of silently truncating.
//   "4500"->4500  "4.500"->4500  "1.234.567"->1234567
//   "4,5"->4.5    "1.234,5"->1234.5   "4.5"->4.5   "0,5"->0.5
//   "1.500.00"->null   "1.2.3"->null   "abc"->null
export function parseIndoNumber(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  let normalized: string
  if (s.includes(',')) {
    // comma = decimal; any dots must be valid thousands groups (or absent)
    if (!/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s) && !/^\d+(,\d+)?$/.test(s)) return null
    normalized = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, '') // thousand-grouped: 4.500 / 1.234.567
  } else if (/^\d+(\.\d+)?$/.test(s)) {
    normalized = s // plain integer or a single decimal point
  } else {
    return null // malformed (e.g. "1.500.00", "1.2.3")
  }
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : null
}

// Parse a tiered quantity expression into BASE units.
//   "4500" / "4.500"      -> 4500              (bare number = base unit)
//   "4,5 kemasan"          -> 4.5 * factor(kemasan)
//   "3 karton 5 pcs 40 ml" -> 3*f(karton) + 5*f(pcs) + 40*f(ml)
// The whole input must be a sequence of "<number> <unit?>" groups (number-led):
//   - unknown tier labels are rejected (a typo can't silently miscount),
//   - a leading/orphan label ("karton 3") is rejected (would drop the tier factor),
//   - trailing junk ("3 karton abc") is rejected,
//   - a malformed number ("1.500.00") is rejected.
export function parseTieredQty(text: string, tiers: TierDef[]): ParseTieredResult {
  const norm = text.trim().toLowerCase()
  if (!norm) return { base: null, error: 'kosong' }

  // Shape guard: only "<number> <unit?>" groups, number-led, nothing else.
  if (!/^(\s*\d[\d.,]*\s*[a-z]*\s*)+$/.test(norm)) {
    return { base: null, error: 'format tidak dikenal (contoh: 3 karton 2 pcs)' }
  }

  const byLabel = new Map<string, number>()
  for (const t of tiers) byLabel.set(t.label.toLowerCase(), t.factor_to_base)

  const re = /(\d[\d.,]*)\s*([a-z]+)?/g
  let m: RegExpExecArray | null
  let base = 0
  let matched = false

  while ((m = re.exec(norm)) !== null) {
    const qty = parseIndoNumber(m[1]!)
    if (qty === null) return { base: null, error: `angka "${m[1]}" tidak valid` }
    const label = m[2]?.trim()
    let factor = 1 // bare number = base unit
    if (label) {
      const f = byLabel.get(label)
      if (f === undefined) return { base: null, error: `satuan "${label}" tidak dikenal` }
      factor = f
    }
    base += qty * factor
    matched = true
  }

  if (!matched) return { base: null, error: 'tidak ada angka' }
  if (base <= 0) return { base: null, error: 'jumlah harus lebih dari 0' }
  return { base }
}
