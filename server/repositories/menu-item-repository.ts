import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert, TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

const BASE_COLUMNS = 'id, name, category_id, selling_price, is_active'

// Full shape for list/detail: menu + its category thresholds + recipe lines with ingredient cost.
const FULL_SELECT = `
  id, name, category_id, selling_price, is_active,
  menu_categories ( name, safe_threshold, warning_threshold ),
  recipe_items ( quantity, ingredient_id, ingredients ( name, base_unit, unit_cost ) )
`

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getMenuItems(event: H3Event, categoryId?: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  let query = supabase.from('menu_items').select(FULL_SELECT).order('name')
  if (categoryId) query = query.eq('category_id', categoryId)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getMenuItemById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.from('menu_items').select(FULL_SELECT).eq('id', id).single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Menu not found' })
  return data
}

export async function createMenuItem(
  event: H3Event,
  payload: { name: string; category_id: string; selling_price: number },
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload as TablesInsert<'menu_items'>)
    .select(BASE_COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateMenuItem(
  event: H3Event,
  id: string,
  payload: TablesUpdate<'menu_items'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('menu_items')
    .update(payload)
    .eq('id', id)
    .select(BASE_COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Menu not found' })
  return data
}

export async function deleteMenuItem(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
