import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

export interface WalletPatchPayload {
  name?: string
  balance?: number
  is_active?: boolean
}

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

export async function getAllWallets(event: H3Event, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, balance, is_active')
    .eq('is_active', true)
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getWalletById(event: H3Event, id: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, balance, is_active')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })
  return data
}

export async function findWalletByName(event: H3Event, name: string, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('wallets')
    .select('id, name, balance, is_active')
    .ilike('name', name)
    .eq('is_active', true)
    .single()
  if (error) return null
  return data
}

export async function updateWallet(event: H3Event, id: string, payload: WalletPatchPayload) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('wallets')
    .update(payload as TablesUpdate<'wallets'>)
    .eq('id', id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function setOpeningBalance(event: H3Event, id: string, amount: number) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('wallets')
    .update({ balance: amount })
    .eq('id', id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

// Read-then-write: not atomic under concurrent requests.
// For a single-outlet app with 3 users this is acceptable.
export async function adjustWalletBalance(event: H3Event, id: string, delta: number, client?: SupabaseClient) {
  const supabase = await resolveClient(event, client)
  const { data: wallet, error: fetchError } = await supabase
    .from('wallets')
    .select('balance')
    .eq('id', id)
    .single()
  if (fetchError) throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })

  const { data, error } = await supabase
    .from('wallets')
    .update({ balance: Number(wallet.balance) + delta })
    .eq('id', id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}
