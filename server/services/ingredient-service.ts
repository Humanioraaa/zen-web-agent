import type { H3Event } from 'h3'
import type { Ingredient, IngredientCreateInput, IngredientUpdateInput } from '~/types/ingredient'
import {
  getIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  countIngredientRecipeUsage,
} from '../repositories/ingredient-repository'

type IngredientRow = Awaited<ReturnType<typeof getIngredients>>[number]

// Draft unit-cost preview (no persistence) — mirrors the generated column package_cost / package_size
export function calcUnitCost(packageSize: number, packageCost: number): number {
  if (packageSize <= 0) return 0
  return Math.round((packageCost / packageSize) * 10000) / 10000
}

function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    base_unit: row.base_unit as Ingredient['base_unit'],
    package_size: Number(row.package_size),
    package_cost: Number(row.package_cost),
    unit_cost: Number(row.unit_cost),
    is_active: row.is_active,
    price_alert_threshold_pct:
      row.price_alert_threshold_pct === null ? null : Number(row.price_alert_threshold_pct),
  }
}

export async function listIngredients(event: H3Event, activeOnly = false): Promise<Ingredient[]> {
  const rows = await getIngredients(event, activeOnly)
  return rows.map(toIngredient)
}

export async function getIngredient(event: H3Event, id: string): Promise<Ingredient> {
  const row = await getIngredientById(event, id)
  return toIngredient(row)
}

export async function addIngredient(event: H3Event, payload: IngredientCreateInput): Promise<Ingredient> {
  const row = await createIngredient(event, payload)
  return toIngredient(row)
}

export async function editIngredient(event: H3Event, id: string, payload: IngredientUpdateInput): Promise<Ingredient> {
  const row = await updateIngredient(event, id, payload)
  return toIngredient(row)
}

export async function removeIngredient(event: H3Event, id: string): Promise<void> {
  const used = await countIngredientRecipeUsage(event, id)
  if (used > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Bahan dipakai di resep, tidak bisa dihapus',
    })
  }
  await deleteIngredient(event, id)
}
