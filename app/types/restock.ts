export type QtyUnit = 'package' | 'base'
export type AnomalyVerdict = 'baseline' | 'normal' | 'anomaly'
export type AnomalyDirection = 'naik' | 'turun' | null
export type PriceSource = 'restock' | 'manual' | 'seed'

export interface RestockPreviewInput {
  ingredient_id: string
  qty_value: number
  qty_unit: QtyUnit
  total_cost: number
}

// All values computed by the backend.
export interface RestockPreview {
  ingredient_id: string
  ingredient_name: string
  base_unit: string
  packages: number // resolved package count (qty in base units ÷ package size)
  package_cost: number // derived per-package price = total_cost ÷ packages
  unit_cost: number // per base unit
  last_package_cost: number // ingredient's current price (comparison baseline)
  pct_change: number | null // vs last price; null when baseline
  verdict: AnomalyVerdict
  direction: AnomalyDirection
  threshold_pct: number // effective threshold used (ingredient override ?? global)
}

export interface RestockCommitInput extends RestockPreviewInput {
  wallet_id: string
  accept_price?: boolean // owner's decision on an anomaly
  category_id?: string
  note?: string
}

export interface RestockResult {
  restock_id: string
  transaction_id: string
  applied: boolean // whether the current price was updated
  package_cost: number
  unit_cost: number
}

export interface PriceHistoryPoint {
  id: string
  package_cost: number
  unit_cost: number
  pct_change: number | null
  source: PriceSource
  created_at: string
}

// --- Fuzzy ingredient matching (bot disambiguation) ---
export type MatchVerdict = 'exact' | 'near' | 'none'

export interface IngredientCandidate {
  id: string
  name: string
  base_unit: string
  similarity: number
}

export interface IngredientMatchResult {
  verdict: MatchVerdict
  candidates: IngredientCandidate[]
}
