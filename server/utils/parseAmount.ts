const AMOUNT_PATTERN = /^(\d[\d.,]*)\s*(k|rb|ribu|jt|juta)?$/i

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
}

// Parses Indonesian-style amounts. Two separator conventions:
// - WITH a unit suffix (k/rb/jt/juta) a separator is a DECIMAL point: "1.5jt" = 1.500.000, "1,5jt" = 1.500.000
// - WITHOUT a suffix, dots are thousands separators and a comma is the decimal: "1.500.000" = 1500000, "1500,50" = 1500.5
// (The old code stripped ALL dots first, so "1.5jt" became "15jt" = 15.000.000 — a 10x bug.)
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/\s+/g, '')
  const match = cleaned.match(AMOUNT_PATTERN)
  if (!match) return null

  const raw = match[1]!
  const suffix = match[2]?.toLowerCase()
  const multiplier = suffix ? (MULTIPLIERS[suffix] ?? 1) : 1

  const normalized = suffix
    ? raw.replace(',', '.') // suffix → separator is a decimal point
    : raw.replace(/\./g, '').replace(',', '.') // no suffix → dots are thousands, comma is decimal

  const base = parseFloat(normalized)
  if (isNaN(base) || base <= 0) return null

  return Math.round(base * multiplier)
}
