import { serverSupabaseClient } from '#supabase/server'
import type { TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

export async function getAllWallets(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('wallets')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getWalletById(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('wallets')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })
  return data
}

export async function updateWallet(event: H3Event, id: string, payload: Record<string, unknown>) {
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

export async function adjustWalletBalance(event: H3Event, id: string, delta: number) {
  const client = await serverSupabaseClient(event)
  const { data: wallet, error: fetchError } = await client
    .from('wallets')
    .select('balance')
    .eq('id', id)
    .single()
  if (fetchError) throw createError({ statusCode: 404, statusMessage: 'Wallet not found' })

  const { data, error } = await client
    .from('wallets')
    .update({ balance: Number(wallet.balance) + delta })
    .eq('id', id)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}
