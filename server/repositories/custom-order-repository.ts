import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert, TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

const COLUMNS =
  'id, customer_name, item_name, qty, unit_price, quoted_price, order_date, due_date, status, notes, created_by, created_at, updated_at'

// Minimal transaction shape for per-order P&L + detail listing.
const TX_COLUMNS = 'id, type, amount, note, date, category_id, wallet_id, custom_order_id'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? (await serverSupabaseClient(event))
}

export async function getCustomOrders(event: H3Event, status?: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  let query = supabase.from('custom_orders').select(COLUMNS).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getCustomOrderById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.from('custom_orders').select(COLUMNS).eq('id', id).single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Custom order not found' })
  return data
}

export async function createCustomOrder(
  event: H3Event,
  payload: TablesInsert<'custom_orders'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.from('custom_orders').insert(payload).select(COLUMNS).single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateCustomOrder(
  event: H3Event,
  id: string,
  payload: TablesUpdate<'custom_orders'>,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('custom_orders')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Custom order not found' })
  return data
}

export async function deleteCustomOrder(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase.from('custom_orders').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

// Tagged-transaction sums for a set of orders — powers the list P&L (BE-summed).
export async function getOrderTransactionAggregates(
  event: H3Event,
  orderIds?: string[],
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  let query = supabase
    .from('transactions')
    .select('custom_order_id, type, amount')
    .not('custom_order_id', 'is', null)
  if (orderIds && orderIds.length) query = query.in('custom_order_id', orderIds)
  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// Tagged transactions for one order — powers the detail page + its P&L.
export async function getTransactionsByOrder(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_COLUMNS)
    .eq('custom_order_id', id)
    .order('date', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}
