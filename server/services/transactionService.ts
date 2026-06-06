import { serverSupabaseUser } from '#supabase/server'
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

type BalanceTx = {
  type: string
  amount: number | string
  wallet_id: string
  wallet_to_id?: string | null
}

// Applies (direction = 1) or reverses (direction = -1) a transaction's effect on wallet balances.
// expense: source -amount | income: source +amount | transfer: source -amount, dest +amount
async function applyBalanceEffect(event: H3Event, tx: BalanceTx, direction: 1 | -1) {
  const amt = Number(tx.amount) * direction
  if (tx.type === 'expense') {
    await adjustWalletBalance(event, tx.wallet_id, -amt)
  } else if (tx.type === 'income') {
    await adjustWalletBalance(event, tx.wallet_id, amt)
  } else if (tx.type === 'transfer' && tx.wallet_to_id) {
    await adjustWalletBalance(event, tx.wallet_id, -amt)
    await adjustWalletBalance(event, tx.wallet_to_id, amt)
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
  },
) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const transaction = await createTransaction(event, {
    ...payload,
    created_by: authUser.id,
    source: payload.source ?? 'web',
    date: payload.date ?? new Date().toISOString().split('T')[0],
  })

  await applyBalanceEffect(event, payload, 1)

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
  // reverse the original balance effect, then apply the updated one
  await applyBalanceEffect(event, before as unknown as BalanceTx, -1)
  const after = await updateTransaction(event, id, payload)
  await applyBalanceEffect(event, after as unknown as BalanceTx, 1)

  await createAuditLog(event, {
    entityType: 'transaction',
    entityId: id,
    action: 'update',
    before,
    after,
    performedBy: authUser.id,
  })

  return after
}

export async function removeTransaction(event: H3Event, id: string) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const transaction = await getTransactionById(event, id)

  await applyBalanceEffect(event, transaction as unknown as BalanceTx, -1)

  await createAuditLog(event, {
    entityType: 'transaction',
    entityId: id,
    action: 'delete',
    before: transaction,
    performedBy: authUser.id,
  })

  await deleteTransaction(event, id)
}
