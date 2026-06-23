import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

// Atomic open + prefill via the create_stock_count() Postgres function.
export async function createStockCount(
  event: H3Event,
  params: { created_by: string; count_date: string; note: string | null },
  client?: SupabaseClient,
): Promise<string> {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.rpc('create_stock_count', {
    p_created_by: params.created_by,
    p_count_date: params.count_date,
    p_note: params.note as string,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data as string
}

export async function listStockCounts(event: H3Event, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('stock_counts')
    .select('id, count_date, status, note, total_value, finalized_at, created_at, stock_count_items(count)')
    .order('count_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getStockCountById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('stock_counts')
    .select('id, count_date, status, note, total_value, finalized_at, created_at')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Sesi opname tidak ditemukan' })
  return data
}

export async function getStockCountItems(event: H3Event, stockCountId: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('stock_count_items')
    .select(
      'id, ingredient_id, counted_qty, opening_qty, purchased_qty, unit_cost_snapshot, line_value, note, ' +
      'ingredients(name, base_unit, categories(name))',
    )
    .eq('stock_count_id', stockCountId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// Bulk-save physical counts. One round-trip per line (Supabase has no native bulk-by-id update).
export async function saveStockCountItems(
  event: H3Event,
  items: { item_id: string; counted_qty: number; note?: string | null }[],
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  for (const it of items) {
    const patch: TablesUpdate<'stock_count_items'> = { counted_qty: it.counted_qty }
    if (it.note !== undefined) patch.note = it.note
    const { error } = await supabase.from('stock_count_items').update(patch).eq('id', it.item_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }
}

export async function updateStockCount(
  event: H3Event,
  id: string,
  patch: TablesUpdate<'stock_counts'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('stock_counts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, count_date, status, note, total_value, finalized_at, created_at')
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Sesi opname tidak ditemukan' })
  return data
}

export async function deleteStockCount(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase.from('stock_counts').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
