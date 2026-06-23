import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getPeriodSales(event: H3Event, stockCountId: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('period_sales')
    .select('menu_id, qty_sold')
    .eq('stock_count_id', stockCountId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// Upsert one row per menu on (stock_count_id, menu_id).
export async function upsertPeriodSales(
  event: H3Event,
  stockCountId: string,
  items: { menu_id: string; qty_sold: number }[],
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  if (items.length === 0) return
  const rows = items.map((it) => ({
    stock_count_id: stockCountId,
    menu_id: it.menu_id,
    qty_sold: it.qty_sold,
  }))
  const { error } = await supabase
    .from('period_sales')
    .upsert(rows, { onConflict: 'stock_count_id,menu_id' })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
