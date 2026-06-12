import { serverSupabaseUser } from '#supabase/server'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { TransactionPatchPayload } from '../repositories/transactionRepository'
import {
  getRecentTransactions,
  getSummaryByDate,
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../repositories/transactionRepository'
import { adjustWalletBalance } from '../repositories/walletRepository'
import { createAuditLog } from '../repositories/auditLogRepository'

interface BalanceEffect {
  type: string
  amount: number
  wallet_id: string
  wallet_to_id?: string | null
}

async function applyBalanceEffect(event: H3Event, tx: BalanceEffect, direction: 1 | -1, client?: SupabaseClient) {
  const delta = tx.amount * direction
  if (tx.type === 'expense') {
    await adjustWalletBalance(event, tx.wallet_id, -delta, client)
  } else if (tx.type === 'income') {
    await adjustWalletBalance(event, tx.wallet_id, delta, client)
  } else if (tx.type === 'transfer' && tx.wallet_to_id) {
    await adjustWalletBalance(event, tx.wallet_id, -delta, client)
    await adjustWalletBalance(event, tx.wallet_to_id, delta, client)
  }
}

function extractBalanceEffect(tx: { type: string; amount: number; wallet_id: string; wallet_to_id?: string | null }): BalanceEffect {
  return {
    type: tx.type,
    amount: tx.amount,
    wallet_id: tx.wallet_id,
    wallet_to_id: tx.wallet_to_id,
  }
}

export async function getRecent(event: H3Event, limit: number) {
  return getRecentTransactions(event, limit)
}

export async function getSummary(event: H3Event, date: string) {
  return getSummaryByDate(event, date)
}

export async function listTransactions(
  event: H3Event,
  filters: Parameters<typeof getTransactions>[1],
) {
  return getTransactions(event, filters)
}

export async function addTransaction(
  event: H3Event,
  payload: {
    type: 'income' | 'expense' | 'transfer'
    amount: number
    wallet_id: string
    wallet_to_id?: string
    category_id?: string
    note?: string
    date?: string
    source?: 'web' | 'telegram'
    created_by?: string
  },
) {
  let createdBy: string
  let client: SupabaseClient | undefined

  if (payload.created_by) {
    createdBy = payload.created_by
    client = serverSupabaseServiceRole(event)
  } else {
    const authUser = await serverSupabaseUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    createdBy = authUser.sub
  }

  const transaction = await createTransaction(event, {
    ...payload,
    created_by: createdBy,
    source: payload.source ?? 'web',
    date: payload.date ?? new Date().toISOString().slice(0, 10),
  }, client)

  await applyBalanceEffect(event, payload, 1, client)

  return transaction
}

export async function editTransaction(
  event: H3Event,
  id: string,
  payload: TransactionPatchPayload,
) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const before = await getTransactionById(event, id)
  await applyBalanceEffect(event, extractBalanceEffect(before), -1)
  const after = await updateTransaction(event, id, payload)
  await applyBalanceEffect(event, extractBalanceEffect(after), 1)

  await createAuditLog(event, {
    entityType: 'transaction',
    entityId: id,
    action: 'update',
    before,
    after,
    performedBy: authUser.sub,
  })

  return after
}

export async function removeTransaction(event: H3Event, id: string) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const transaction = await getTransactionById(event, id)

  await applyBalanceEffect(event, extractBalanceEffect(transaction), -1)

  await createAuditLog(event, {
    entityType: 'transaction',
    entityId: id,
    action: 'delete',
    before: transaction,
    performedBy: authUser.sub,
  })

  await deleteTransaction(event, id)
}
