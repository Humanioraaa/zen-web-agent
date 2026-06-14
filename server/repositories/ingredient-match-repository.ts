import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

// Trigram-ranked ingredient lookup via the match_ingredients() Postgres function.
export async function matchIngredients(
  event: H3Event,
  query: string,
  client?: SupabaseClient,
  limit = 5,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.rpc('match_ingredients', { p_query: query, p_limit: limit })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
}
