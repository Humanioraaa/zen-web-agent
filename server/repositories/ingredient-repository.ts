import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert, TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

const COLUMNS = 'id, name, base_unit, package_size, package_cost, unit_cost, is_active, price_alert_threshold_pct'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getIngredients(event: H3Event, activeOnly = false, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  let query = supabase.from('ingredients').select(COLUMNS).order('name')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getIngredientById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.from('ingredients').select(COLUMNS).eq('id', id).single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Ingredient not found' })
  return data
}

export async function createIngredient(
  event: H3Event,
  payload: { name: string; base_unit: string; package_size: number; package_cost: number },
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('ingredients')
    .insert(payload as TablesInsert<'ingredients'>)
    .select(COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateIngredient(
  event: H3Event,
  id: string,
  payload: TablesUpdate<'ingredients'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('ingredients')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Ingredient not found' })
  return data
}

export async function deleteIngredient(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// Blocks deletion of ingredients used in any recipe
export async function countIngredientRecipeUsage(event: H3Event, id: string, client?: SupabaseClient): Promise<number> {
  const supabase = await resolveClient(event, client)
  const { count, error } = await supabase
    .from('recipe_items')
    .select('id', { count: 'exact', head: true })
    .eq('ingredient_id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return count ?? 0
}
