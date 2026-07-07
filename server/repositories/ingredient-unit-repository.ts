import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert } from '~/types/database.types'
import type { H3Event } from 'h3'

const COLUMNS = 'id, ingredient_id, label, factor_to_base, is_base, sort_order'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? (await serverSupabaseClient(event))
}

export async function getIngredientUnits(event: H3Event, ingredientId: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('ingredient_units')
    .select(COLUMNS)
    .eq('ingredient_id', ingredientId)
    .order('sort_order')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// Replace the full tier set for an ingredient (delete + insert). Callers pass
// resolved absolute factors; the service enforces exactly one base tier.
export async function replaceIngredientUnits(
  event: H3Event,
  ingredientId: string,
  units: { label: string; factor_to_base: number; is_base: boolean; sort_order: number }[],
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { error: delError } = await supabase.from('ingredient_units').delete().eq('ingredient_id', ingredientId)
  if (delError) throw createError({ statusCode: 500, statusMessage: delError.message })
  if (units.length === 0) return
  const rows: TablesInsert<'ingredient_units'>[] = units.map((u) => ({ ingredient_id: ingredientId, ...u }))
  const { error } = await supabase.from('ingredient_units').insert(rows)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
