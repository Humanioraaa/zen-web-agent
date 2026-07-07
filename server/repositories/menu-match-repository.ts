import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

// Trigram-ranked menu lookup via the match_menu_items() Postgres function.
// Used by the Kasir Pintar sales import to map a KP product name → menu item.
export async function matchMenuItems(
  event: H3Event,
  query: string,
  client?: SupabaseClient,
  limit = 5,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase.rpc('match_menu_items', { p_query: query, p_limit: limit })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
}
