import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import type {
  MenuListItem,
  MenuDetail,
  MenuHealth,
  RecipeLine,
  MenuCreateInput,
  MenuUpdateInput,
  RecipeItemInput,
  MenuCalculateInput,
  MenuCalculateResult,
} from '~/types/menu'
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../repositories/menu-item-repository'
import { replaceRecipeItems, getIngredientCosts } from '../repositories/recipe-repository'
import { getMenuCategoryById } from '../repositories/menu-category-repository'

// --- shared calculation helpers (single source of truth) -------------------

function computeHealth(marginPct: number | null, safe: number, warning: number): MenuHealth {
  if (marginPct === null) return 'unknown'
  if (marginPct >= safe) return 'safe'
  if (marginPct >= warning) return 'warning'
  return 'danger'
}

function round(value: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

function computeTotals(rawHpp: number, sellingPrice: number) {
  const hpp = round(rawHpp)
  const margin = round(sellingPrice - rawHpp)
  const marginPct = sellingPrice > 0 ? round(((sellingPrice - rawHpp) / sellingPrice) * 100, 1) : null
  return { hpp, margin, marginPct }
}

// --- row unwrapping (supabase embeds may be object or single-element array) --

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

interface RecipeRowItem {
  quantity: number | string
  ingredient_id: string
  ingredients: { name: string; base_unit: string; unit_cost: number | string } | { name: string; base_unit: string; unit_cost: number | string }[] | null
}

interface MenuFullRow {
  id: string
  name: string
  category_id: string
  selling_price: number | string
  is_active: boolean
  menu_categories: { name: string; safe_threshold: number | string; warning_threshold: number | string } | { name: string; safe_threshold: number | string; warning_threshold: number | string }[] | null
  recipe_items: RecipeRowItem[] | null
}

function buildRecipeLines(items: RecipeRowItem[]): RecipeLine[] {
  return items.map((it) => {
    const ing = unwrap(it.ingredients)
    const quantity = Number(it.quantity)
    const unitCost = Number(ing?.unit_cost ?? 0)
    return {
      ingredient_id: it.ingredient_id,
      ingredient_name: ing?.name ?? '?',
      base_unit: ing?.base_unit ?? '',
      quantity,
      unit_cost: unitCost,
      line_cost: round(quantity * unitCost),
    }
  })
}

function toMenuListItem(row: MenuFullRow): MenuListItem {
  const cat = unwrap(row.menu_categories)
  const safe = Number(cat?.safe_threshold ?? 65)
  const warning = Number(cat?.warning_threshold ?? 50)
  const sellingPrice = Number(row.selling_price)
  const rawHpp = (row.recipe_items ?? []).reduce((sum, it) => {
    const ing = unwrap(it.ingredients)
    return sum + Number(it.quantity) * Number(ing?.unit_cost ?? 0)
  }, 0)
  const { hpp, margin, marginPct } = computeTotals(rawHpp, sellingPrice)
  return {
    id: row.id,
    name: row.name,
    category_id: row.category_id,
    category_name: cat?.name ?? '?',
    selling_price: sellingPrice,
    hpp,
    margin,
    margin_pct: marginPct,
    health: computeHealth(marginPct, safe, warning),
  }
}

// --- public service API ----------------------------------------------------

export async function listMenu(event: H3Event, categoryId?: string): Promise<MenuListItem[]> {
  const rows = await getMenuItems(event, categoryId)
  return (rows as unknown as MenuFullRow[]).map(toMenuListItem)
}

export async function getMenuDetail(event: H3Event, id: string): Promise<MenuDetail> {
  const row = (await getMenuItemById(event, id)) as unknown as MenuFullRow
  const base = toMenuListItem(row)
  return {
    ...base,
    is_active: row.is_active,
    recipe: buildRecipeLines(row.recipe_items ?? []),
  }
}

export async function addMenu(event: H3Event, payload: MenuCreateInput): Promise<MenuDetail> {
  const created = await createMenuItem(event, payload)
  return getMenuDetail(event, created.id)
}

export async function editMenu(event: H3Event, id: string, payload: MenuUpdateInput): Promise<MenuDetail> {
  await updateMenuItem(event, id, payload)
  return getMenuDetail(event, id)
}

export async function removeMenu(event: H3Event, id: string): Promise<void> {
  await deleteMenuItem(event, id)
}

export async function saveRecipe(event: H3Event, menuId: string, items: RecipeItemInput[]): Promise<MenuDetail> {
  // ensure menu exists (404 otherwise)
  await getMenuItemById(event, menuId)
  await replaceRecipeItems(event, menuId, items)
  return getMenuDetail(event, menuId)
}

export async function calculatePreview(event: H3Event, input: MenuCalculateInput): Promise<MenuCalculateResult> {
  const client = await serverSupabaseClient(event)
  const category = await getMenuCategoryById(event, input.category_id, client)
  const safe = Number(category.safe_threshold)
  const warning = Number(category.warning_threshold)

  const ids = [...new Set(input.items.map((i) => i.ingredient_id))]
  const costs = await getIngredientCosts(event, ids, client)
  const costMap = new Map(costs.map((c) => [c.id, Number(c.unit_cost)]))

  const lines = input.items.map((it) => ({
    ingredient_id: it.ingredient_id,
    line_cost: round(it.quantity * (costMap.get(it.ingredient_id) ?? 0)),
  }))
  const rawHpp = input.items.reduce((sum, it) => sum + it.quantity * (costMap.get(it.ingredient_id) ?? 0), 0)
  const { hpp, margin, marginPct } = computeTotals(rawHpp, input.selling_price)

  return { hpp, margin, margin_pct: marginPct, health: computeHealth(marginPct, safe, warning), lines }
}
