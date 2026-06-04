import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import {
  getAllWallets,
  getWalletById,
  updateWallet,
  setOpeningBalance,
} from '../repositories/walletRepository'
import { createAuditLog } from '../repositories/auditLogRepository'

export async function getWallets(event: H3Event) {
  return getAllWallets(event)
}

export async function getWallet(event: H3Event, id: string) {
  return getWalletById(event, id)
}

export async function patchWallet(event: H3Event, id: string, payload: Record<string, unknown>) {
  // Only balance changes are audited; name/is_active edits update without a log.
  if (!('balance' in payload)) {
    return updateWallet(event, id, payload)
  }

  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const before = await getWalletById(event, id)
  const updated = await updateWallet(event, id, payload)

  await createAuditLog(event, {
    entityType: 'wallet',
    entityId: id,
    action: 'update',
    before: { balance: before.balance },
    after: { balance: updated.balance },
    performedBy: authUser.id,
  })

  return updated
}

export async function setOpeningBalances(
  event: H3Event,
  balances: Array<{ wallet_id: string; amount: number }>,
) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser)
     throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  for (const { wallet_id, amount } of balances) {
    const before = await getWalletById(event, wallet_id)
    const after = await setOpeningBalance(event, wallet_id, amount)
    await createAuditLog(event, {
      entityType: 'wallet',
      entityId: wallet_id,
      action: 'update',
      before: { balance: before.balance },
      after: { balance: after.balance },
      performedBy: authUser.id,
    })
  }

  return { updated: balances.length }
}
