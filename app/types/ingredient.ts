export type BaseUnit = 'ml' | 'g' | 'pcs'

export interface Ingredient {
  id: string
  name: string
  base_unit: BaseUnit
  package_size: number
  package_cost: number
  unit_cost: number
  is_active: boolean
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
}
