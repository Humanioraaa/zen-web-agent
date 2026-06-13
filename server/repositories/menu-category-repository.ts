import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert, TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

const COLUMNS = 'id, name, sort_order, safe_threshold, warning_threshold'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

// List with per-category menu-item count (single query via embedded count)
export async function getMenuCategories(event: H3Event, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`${COLUMNS}, menu_items(count)`)
    .order('sort_order')
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getMenuCategoryById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.from('menu_categories').select(COLUMNS).eq('id', id).single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Menu category not found' })
  return data
}

export async function createMenuCategory(
  event: H3Event,
  payload: { name: string; sort_order?: number; safe_threshold?: number; warning_threshold?: number },
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('menu_categories')
    .insert(payload as TablesInsert<'menu_categories'>)
    .select(COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateMenuCategory(
  event: H3Event,
  id: string,
  payload: TablesUpdate<'menu_categories'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('menu_categories')
    .update(payload)
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Menu category not found' })
  return data
}

export async function deleteMenuCategory(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// Blocks deletion of categories used by any menu item
export async function countMenuCategoryUsage(event: H3Event, id: string, client?: SupabaseClient): Promise<number> {
  const supabase = await resolveClient(event, client)
  const { count, error } = await supabase
    .from('menu_items')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return count ?? 0
}
