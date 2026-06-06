import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Enums, TablesInsert, TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

const TRANSACTION_SELECT = `
  *,
  wallet:wallets!wallet_id(id, name),
  wallet_to:wallets!wallet_to_id(id, name),
  category:categories(id, name, type),
  creator:users!created_by(id, name)
`

export async function getRecentTransactions(event: H3Event, limit: number) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getSummaryByDate(event: H3Event, date: string) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('transactions')
    .select('type, amount')
    .eq('date', date)
    .in('type', ['income', 'expense'])
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const income = data
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const expense = data
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return { income, expense, date }
}

export async function getTransactions(
  event: H3Event,
  filters: {
    type?: string
    wallet_id?: string
    category_id?: string
    date_from?: string
    date_to?: string
    search?: string
    limit?: number
    offset?: number
  },
) {
  const client = await serverSupabaseClient(event)
  const limit = filters.limit ?? 20
  const offset = filters.offset ?? 0

  let query = client
    .from('transactions')
    .select(TRANSACTION_SELECT, { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.type) query = query.eq('type', filters.type as Enums<'transaction_type'>)
  if (filters.wallet_id) query = query.eq('wallet_id', filters.wallet_id)
  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.date_from) query = query.gte('date', filters.date_from)
  if (filters.date_to) query = query.lte('date', filters.date_to)
  if (filters.search) query = query.ilike('note', `%${escapeLikePattern(filters.search)}%`)

  const { data, error, count } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { data: data ?? [], total: count ?? 0 }
}

export async function createTransaction(
  event: H3Event,
  payload: {
    type: string
    amount: number
    wallet_id: string
    wallet_to_id?: string
    category_id?: string
    note?: string
    date?: string
    source?: string
    created_by: string
  },
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('transactions')
    .insert(payload as TablesInsert<'transactions'>)
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function getTransactionById(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
  return data
}

export interface TransactionPatchPayload {
  amount?: number
  wallet_id?: string
  wallet_to_id?: string | null
  category_id?: string | null
  note?: string | null
  date?: string
}

export async function updateTransaction(
  event: H3Event,
  id: string,
  payload: TransactionPatchPayload,
) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('transactions')
    .update(payload as TablesUpdate<'transactions'>)
    .eq('id', id)
    .select(TRANSACTION_SELECT)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function deleteTransaction(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { error } = await client.from('transactions').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
