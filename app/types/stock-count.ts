// Stock Opname (periodic physical inventory) — FE-facing DTOs.
// Periodic model: konsumsi = stok awal + pembelian − stok akhir (hitung fisik).
// All values computed by the backend; FE only displays.

export type StockCountStatus = 'draft' | 'finalized'

// One row in the session list
export interface StockCountSummary {
  id: string
  count_date: string
  status: StockCountStatus
  note: string | null
  category_name: string | null // area (Bahan Baku Kitchen / Bar); null = full-shop
  total_value: number | null // summed on-hand value (null until finalized)
  item_count: number
  finalized_at: string | null
  created_at: string
}

// One ingredient line within a session, with computed period consumption.
export interface StockCountLine {
  id: string
  ingredient_id: string
  ingredient_name: string
  base_unit: string
  category_name: string | null
  counted: boolean // false = not yet counted (distinct from a counted value of 0)
  counted_qty: number // physical count entered by owner
  opening_qty: number | null // prev finalized count's physical qty (null = first count)
  purchased_qty: number | null // restocks (base unit) since prev count (null = first count)
  unit_cost_snapshot: number
  line_value: number // counted_qty * unit_cost_snapshot (current on-hand value)
  // Computed (null when opening/purchased unknown — i.e. first count):
  consumed_qty: number | null // opening + purchased − counted (sales + waste combined)
  consumed_value: number | null // consumed_qty * unit_cost_snapshot
  // Fase 3 — theoretical vs actual (null when no sales entered for the period):
  theoretical_qty: number | null // Σ qty_sold × recipe quantity (pemakaian sah)
  variance_qty: number | null // consumed_qty − theoretical_qty (waste + susut)
  variance_value: number | null // variance_qty * unit_cost_snapshot
  note: string | null
}

export interface StockCountDetail {
  id: string
  count_date: string
  status: StockCountStatus
  note: string | null
  category_name: string | null // area label; null = full-shop
  counted_count: number // lines actually counted
  item_count: number // total lines in the session
  total_value: number | null
  total_consumed_value: number | null // sum of line consumed_value (period actual COGS)
  total_theoretical_value: number | null // sum of theoretical usage value (pemakaian sah)
  total_variance_value: number | null // sum of variance value (waste + susut); null when no sales
  has_sales: boolean // any period_sales rows entered for this count
  finalized_at: string | null
  created_at: string
  items: StockCountLine[]
}

// --- Fase 3: period sales (units sold per menu, drives theoretical usage) ---
export interface PeriodSaleLine {
  menu_id: string
  menu_name: string
  category_name: string | null
  qty_sold: number
}

export interface PeriodSalesSaveInput {
  items: { menu_id: string; qty_sold: number }[]
}

// --- Fase 4: Kasir Pintar sales import (parse KP JSON → match menu → prefill sales) ---
export interface SalesImportSuggestion {
  menu_id: string
  menu_name: string
  similarity: number
}

export interface SalesImportMatchedLine {
  menu_id: string
  menu_name: string
  kp_name: string // the KP product name it came from (may differ / be a variant)
  qty_sold: number
  confidence: 'exact' | 'fuzzy'
  similarity: number | null // trigram score when fuzzy; null when exact
}

export interface SalesImportUnmatchedLine {
  kp_name: string
  qty_sold: number
  suggestions: SalesImportSuggestion[] // nearest menu items (owner picks or ignores)
}

export interface SalesImportPreview {
  matched: SalesImportMatchedLine[]
  unmatched: SalesImportUnmatchedLine[]
  total_items: number // distinct KP products across the uploaded files
  total_qty: number // Σ qty across all products (matched + unmatched)
}

export interface StockCountCreateInput {
  count_date?: string // defaults to today on the server
  note?: string
  category_id?: string | null // area to count (null/omitted = full-shop)
}

// Bulk-save physical counts (draft only)
export interface StockCountItemSaveInput {
  item_id: string
  counted_qty: number
  note?: string | null
}

export interface StockCountSaveInput {
  items: StockCountItemSaveInput[]
}
