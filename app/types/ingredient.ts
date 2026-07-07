export type BaseUnit = 'ml' | 'g' | 'pcs'

// A packaging/counting tier for an ingredient (e.g. karton=1200, pcs=100, ml=1).
// factor_to_base = base units per 1 of this tier; the base tier has factor 1.
export interface IngredientUnit {
  id: string
  ingredient_id: string
  label: string
  factor_to_base: number
  is_base: boolean
  sort_order: number
}

// Setup input: tiers entered relatively (karton = 12 pcs, pcs = 100 ml); the
// server resolves absolute factor_to_base. `of` refers to the next-smaller label
// (or omitted for the base tier).
export interface IngredientUnitInput {
  label: string
  per: number // how many of the next-smaller tier fit in 1 of this tier
}

export interface Ingredient {
  id: string
  name: string
  base_unit: BaseUnit
  package_size: number
  package_cost: number
  unit_cost: number
  is_active: boolean
  price_alert_threshold_pct: number | null // null = use global default
  category_id: string | null
  category_name: string | null // joined from categories(name)
}

export interface IngredientCreateInput {
  name: string
  base_unit: BaseUnit
  package_size: number
  package_cost: number
  category_id: string // required: expense category bucket
}

export interface IngredientUpdateInput {
  name?: string
  base_unit?: BaseUnit
  package_size?: number
  package_cost?: number
  is_active?: boolean
  price_alert_threshold_pct?: number | null
  category_id?: string | null
}
