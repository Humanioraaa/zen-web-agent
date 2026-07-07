// Kasir Pintar per-day sales export parser.
// Each file is JSON: { "data": [ { kode_barang, nama_barang, jumlah, total, untung, datavarian? }, ... ] }
// A stock-count period spans several days → several files → aggregate by product.

export interface KpSalesRow {
  kode_barang: string
  nama_barang: string
  jumlah: number
  datavarian: string | null
}

export interface KpAggregatedItem {
  key: string // kode_barang (stable) or normalized name fallback
  nama_barang: string
  qty: number
}

// Parse one KP export file's text. Throws a user-facing message on malformed input.
export function parseKpSalesJson(text: string): KpSalesRow[] {
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'File bukan JSON valid (export Kasir Pintar)' })
  }
  const data = Array.isArray(obj)
    ? obj
    : (obj as { data?: unknown })?.data
  if (!Array.isArray(data)) {
    throw createError({ statusCode: 400, statusMessage: 'Format tidak dikenal — butuh { "data": [ ... ] }' })
  }

  const rows: KpSalesRow[] = []
  for (const raw of data) {
    const r = raw as Record<string, unknown>
    const nama = String(r.nama_barang ?? '').trim()
    const jumlah = Number(r.jumlah)
    if (!nama || !Number.isFinite(jumlah) || jumlah <= 0) continue
    rows.push({
      kode_barang: String(r.kode_barang ?? '').trim(),
      nama_barang: nama,
      jumlah,
      datavarian: r.datavarian != null ? String(r.datavarian).trim() : null,
    })
  }
  return rows
}

// Sum quantities across all rows/files, keyed by kode_barang (falls back to the
// lowercased name when a code is missing). Variant rows sharing a code collapse.
export function aggregateKpSales(rows: KpSalesRow[]): KpAggregatedItem[] {
  const map = new Map<string, KpAggregatedItem>()
  for (const r of rows) {
    const key = r.kode_barang || r.nama_barang.toLowerCase()
    const existing = map.get(key)
    if (existing) existing.qty += r.jumlah
    else map.set(key, { key, nama_barang: r.nama_barang, qty: r.jumlah })
  }
  return [...map.values()]
}
