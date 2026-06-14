import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { RestockResult } from '~/types/restock'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export interface CreateRestockParams {
  ingredient_id: string
  qty_value: number
  qty_unit: string
  packages: number
  total_cost: number
  package_cost: number
  package_size_at_time: number
  pct_change: number | null
  apply_price: boolean
  wallet_id: string
  category_id: string | null
  created_by: string
  source: string
  date: string
  note: string | null
}

// Atomic commit via the create_restock() Postgres function (single DB transaction).
export async function createRestock(
  event: H3Event,
  params: CreateRestockParams,
  client?: SupabaseClient,
): Promise<RestockResult> {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.rpc('create_restock', {
    p_ingredient_id: params.ingredient_id,
    p_qty_value: params.qty_value,
    p_qty_unit: params.qty_unit,
    p_packages: params.packages,
    p_total_cost: params.total_cost,
    p_package_cost: params.package_cost,
    p_package_size_at_time: params.package_size_at_time,
    p_pct_change: params.pct_change,
    p_apply_price: params.apply_price,
    p_wallet_id: params.wallet_id,
    p_category_id: params.category_id,
    p_created_by: params.created_by,
    p_source: params.source,
    p_date: params.date,
    p_note: params.note,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const r = data as {
    restock_id: string
    transaction_id: string
    applied: boolean
    package_cost: number
    unit_cost: number
  }
  return {
    restock_id: r.restock_id,
    transaction_id: r.transaction_id,
    applied: r.applied,
    package_cost: Number(r.package_cost),
    unit_cost: Number(r.unit_cost),
  }
}
