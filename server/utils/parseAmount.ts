const AMOUNT_PATTERN = /^(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|jt|juta)?$/i

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  rb: 1_000,
  ribu: 1_000,
  jt: 1_000_000,
  juta: 1_000_000,
}

export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/\s+/g, '').replace(/\./g, '')
  const match = cleaned.match(AMOUNT_PATTERN)
  if (!match) return null

  const base = parseFloat(match[1]!.replace(',', '.'))
  if (isNaN(base) || base <= 0) return null

  const suffix = match[2]
  const multiplier = suffix ? MULTIPLIERS[suffix.toLowerCase()] ?? 1 : 1

  return base * multiplier
}
