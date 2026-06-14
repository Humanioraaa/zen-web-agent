import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

const COLUMNS = 'id, package_cost, unit_cost, pct_change, source, created_at'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getPriceHistory(event: H3Event, ingredientId: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('ingredient_price_history')
    .select(COLUMNS)
    .eq('ingredient_id', ingredientId)
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}
