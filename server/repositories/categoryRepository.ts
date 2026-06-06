import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Enums, TablesInsert } from '~/types/database.types'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getCategories(event: H3Event, type?: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  let query = supabase.from('categories').select('id, name, type, is_default').order('name')
  if (type) query = query.eq('type', type as Enums<'category_type'>)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function findCategoryByName(event: H3Event, name: string, type?: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  let query = supabase
    .from('categories')
    .select('id, name, type, is_default')
    .ilike('name', name)
  if (type) query = query.eq('type', type as Enums<'category_type'>)
  const { data, error } = await query.limit(1).single()
  if (error) return null
  return data
}

export async function getCategoryById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, type, is_default')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  return data
}

export async function createCategory(
  event: H3Event,
  payload: { name: string; type: string },
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('categories')
    .insert(payload as TablesInsert<'categories'>)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateCategory(
  event: H3Event,
  id: string,
  payload: { name?: string },
) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  return data
}

export async function deleteCategory(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { error } = await client.from('categories').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// Count transactions referencing a category — used to block deletion of in-use categories.
export async function countCategoryTransactions(event: H3Event, id: string): Promise<number> {
  const client = await serverSupabaseClient(event)
  const { count, error } = await client
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return count ?? 0
}
