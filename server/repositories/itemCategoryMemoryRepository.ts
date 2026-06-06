import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export interface ItemCategoryMemory {
  id: string
  keyword: string
  category_id: string
  wallet_id: string | null
  confirmed_count: number
}

export async function findByKeyword(event: H3Event, keyword: string): Promise<ItemCategoryMemory | null> {
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('item_category_memory')
    .select('id, keyword, category_id, wallet_id, confirmed_count')
    .eq('keyword', keyword.trim().toLowerCase())
    .single()
  if (error) return null
  return data
}

export async function createMemory(
  event: H3Event,
  payload: { keyword: string; category_id: string; wallet_id?: string | null },
): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const { error } = await client
    .from('item_category_memory')
    .insert({
      keyword: payload.keyword.trim().toLowerCase(),
      category_id: payload.category_id,
      wallet_id: payload.wallet_id ?? null,
      confirmed_count: 1,
    })
  if (error) console.error('Smart learning insert error:', error.message)
}

export async function incrementCount(event: H3Event, id: string): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const { data: existing } = await client
    .from('item_category_memory')
    .select('confirmed_count')
    .eq('id', id)
    .single()
  if (!existing) return

  const { error } = await client
    .from('item_category_memory')
    .update({ confirmed_count: existing.confirmed_count + 1 })
    .eq('id', id)
  if (error) console.error('Smart learning increment error:', error.message)
}
