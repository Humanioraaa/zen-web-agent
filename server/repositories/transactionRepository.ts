import { serverSupabaseClient } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Enums, TablesInsert, Json } from '~/types/database.types'
import type { H3Event } from 'h3'

async function resolveClient(event: H3Event, client?: SupabaseClient) {
  return client ?? await serverSupabaseClient(event)
}

function normalizeAmount<T extends { amount: unknown }>(row: T): T & { amount: number } {
  return { ...row, amount: Number(row.amount) }
}

const TRANSACTION_SELECT = `
  id, type, amount, wallet_id, wallet_to_id, category_id, note, date, source, created_by, created_at,
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
  return data.map(normalizeAmount)
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

export async function sumByTypeAndDateRange(
  event: H3Event,
  dateFrom: string,
  dateTo: string,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .in('type', ['income', 'expense'])
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const income = (data ?? [])
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)
  const expense = (data ?? [])
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  return { income, expense }
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
  return { data: (data ?? []).map(normalizeAmount), total: count ?? 0 }
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
    custom_order_id?: string | null
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
  return normalizeAmount(data)
}

export async function getTransactionById(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('transactions')
    .select(TRANSACTION_SELECT)
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Transaction not found' })
  return normalizeAmount(data)
}

export interface TransactionPatchPayload {
  amount?: number
  wallet_id?: string
  wallet_to_id?: string | null
  category_id?: string | null
  note?: string | null
  date?: string
}

// Atomic edit: reverse old balance effect + apply new + update row in one DB transaction
// via the edit_transaction() SQL function. Returns nothing — caller re-reads the joined row.
export async function editTransactionAtomic(event: H3Event, id: string, patch: TransactionPatchPayload) {
  const client = await serverSupabaseClient(event)
  const { error } = await client.rpc('edit_transaction', { p_id: id, p_patch: patch as unknown as Json })
  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
}

// Tag/untag a transaction to a custom order. Metadata only — no wallet-balance
// effect — so it deliberately bypasses the atomic edit_transaction() path.
// Pass null to untag.
export async function setTransactionCustomOrder(
  event: H3Event,
  id: string,
  customOrderId: string | null,
  client?: SupabaseClient,
) {
  const supabase = await resolveClient(event, client)
  const { error } = await supabase
    .from('transactions')
    .update({ custom_order_id: customOrderId })
    .eq('id', id)
  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
}

// Atomic delete: reverse balance effect + remove row in one DB transaction.
export async function deleteTransaction(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { error } = await client.rpc('delete_transaction', { p_id: id })
  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
}
