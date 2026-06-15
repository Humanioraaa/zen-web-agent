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
