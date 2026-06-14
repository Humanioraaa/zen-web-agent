export type BaseUnit = 'ml' | 'g' | 'pcs'

export interface Ingredient {
  id: string
  name: string
  base_unit: BaseUnit
  package_size: number
  package_cost: number
  unit_cost: number
  is_active: boolean
  price_alert_threshold_pct: number | null // null = use global default
}

export interface IngredientCreateInput {
  name: string
  base_unit: BaseUnit
  package_size: number
  package_cost: number
}

export interface IngredientUpdateInput {
  name?: string
  base_unit?: BaseUnit
  package_size?: number
  package_cost?: number
  is_active?: boolean
  price_alert_threshold_pct?: number | null
}
