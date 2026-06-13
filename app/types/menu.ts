export type MenuHealth = 'safe' | 'warning' | 'danger' | 'unknown'

export interface MenuCategory {
  id: string
  name: string
  sort_order: number
  safe_threshold: number
  warning_threshold: number
  menu_count?: number
}

export interface MenuCategoryCreateInput {
  name: string
  sort_order?: number
  safe_threshold?: number
  warning_threshold?: number
}

export interface MenuCategoryUpdateInput {
  name?: string
  sort_order?: number
  safe_threshold?: number
  warning_threshold?: number
}

// One ingredient line in a recipe, with computed cost (all numbers from BE)
export interface RecipeLine {
  ingredient_id: string
  ingredient_name: string
  base_unit: string
  quantity: number
  unit_cost: number
  line_cost: number
}

export interface MenuListItem {
  id: string
  name: string
  category_id: string
  category_name: string
  selling_price: number
  hpp: number
  margin: number
  margin_pct: number | null
  health: MenuHealth
}

export interface MenuDetail extends MenuListItem {
  is_active: boolean
  recipe: RecipeLine[]
}

export interface MenuCreateInput {
  name: string
  category_id: string
  selling_price: number
}

export interface MenuUpdateInput {
  name?: string
  category_id?: string
  selling_price?: number
  is_active?: boolean
}

export interface RecipeItemInput {
  ingredient_id: string
  quantity: number
}

export interface MenuCalculateInput {
  category_id: string
  selling_price: number
  items: RecipeItemInput[]
}

export interface MenuCalculateResult {
  hpp: number
  margin: number
  margin_pct: number | null
  health: MenuHealth
  lines: { ingredient_id: string; line_cost: number }[]
}
