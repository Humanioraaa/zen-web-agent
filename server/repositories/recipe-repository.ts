import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesInsert } from '~/types/database.types'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

// Replace all recipe items for a menu (delete existing, insert new). Not transactional —
// Supabase JS has no client-side tx; delete then insert is acceptable for this scope.
export async function replaceRecipeItems(
  event: H3Event,
  menuId: string,
  items: { ingredient_id: string; quantity: number }[],
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)

  const { error: delError } = await supabase.from('recipe_items').delete().eq('menu_id', menuId)
  if (delError) throw createError({ statusCode: 500, statusMessage: delError.message })

  if (items.length === 0) return

  const rows: TablesInsert<'recipe_items'>[] = items.map((it) => ({
    menu_id: menuId,
    ingredient_id: it.ingredient_id,
    quantity: it.quantity,
  }))
  const { error: insError } = await supabase.from('recipe_items').insert(rows)
  if (insError) throw createError({ statusCode: 500, statusMessage: insError.message })
}

// Fetch unit costs for a set of ingredient ids (used by the draft calculate endpoint).
export async function getIngredientCosts(event: H3Event, ingredientIds: string[], client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  if (ingredientIds.length === 0) return []
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name, base_unit, unit_cost')
    .in('id', ingredientIds)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}
