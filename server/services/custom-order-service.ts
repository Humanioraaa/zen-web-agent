import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { TablesInsert, TablesUpdate } from '~/types/database.types'
import type {
  CustomOrder,
  CustomOrderDetail,
  CustomOrderTransaction,
  CustomOrderCreateInput,
  CustomOrderUpdateInput,
} from '~/types/custom-order'
import {
  getCustomOrders,
  getCustomOrderById,
  createCustomOrder,
  updateCustomOrder,
  deleteCustomOrder,
  getOrderTransactionAggregates,
  getTransactionsByOrder,
} from '../repositories/custom-order-repository'
import { createAuditLog } from '../repositories/auditLogRepository'
import { addTransaction } from './transactionService'

type OrderRow = Awaited<ReturnType<typeof getCustomOrderById>>

// --- P&L math (BE single source of truth) ----------------------------------

function round(value: number, decimals = 0): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

function computeTotals(quotedPrice: number, paid: number, cost: number) {
  const margin = round(paid - cost)
  const marginPct = paid > 0 ? round(((paid - cost) / paid) * 100, 1) : null
  return {
    paid: round(paid),
    cost: round(cost),
    margin,
    margin_pct: marginPct,
    outstanding: round(quotedPrice - paid),
  }
}

function toCustomOrder(row: OrderRow, paid = 0, cost = 0): CustomOrder {
  const quotedPrice = Number(row.quoted_price)
  return {
    id: row.id,
    customer_name: row.customer_name,
    item_name: row.item_name,
    qty: Number(row.qty),
    unit_price: row.unit_price === null ? null : Number(row.unit_price),
    quoted_price: quotedPrice,
    order_date: row.order_date,
    due_date: row.due_date ?? null,
    status: row.status as CustomOrder['status'],
    notes: row.notes ?? null,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    ...computeTotals(quotedPrice, paid, cost),
  }
}

async function requireUserId(event: H3Event): Promise<string> {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return authUser.sub
}

// --- public service API -----------------------------------------------------

export async function listCustomOrders(event: H3Event, status?: string): Promise<CustomOrder[]> {
  const rows = await getCustomOrders(event, status)
  if (!rows.length) return []
  const aggregates = await getOrderTransactionAggregates(event, rows.map((r) => r.id))
  const sums = new Map<string, { paid: number; cost: number }>()
  for (const a of aggregates) {
    const key = a.custom_order_id as string
    const cur = sums.get(key) ?? { paid: 0, cost: 0 }
    if (a.type === 'income') cur.paid += Number(a.amount)
    else if (a.type === 'expense') cur.cost += Number(a.amount)
    sums.set(key, cur)
  }
  return rows.map((row) => {
    const s = sums.get(row.id) ?? { paid: 0, cost: 0 }
    return toCustomOrder(row, s.paid, s.cost)
  })
}

export async function getCustomOrder(event: H3Event, id: string): Promise<CustomOrderDetail> {
  const row = await getCustomOrderById(event, id)
  const txs = await getTransactionsByOrder(event, id)
  let paid = 0
  let cost = 0
  const transactions: CustomOrderTransaction[] = txs.map((t) => {
    const amount = Number(t.amount)
    if (t.type === 'income') paid += amount
    else if (t.type === 'expense') cost += amount
    return {
      id: t.id,
      type: t.type as CustomOrderTransaction['type'],
      amount,
      note: t.note ?? null,
      date: t.date,
      category_id: t.category_id ?? null,
      wallet_id: t.wallet_id,
    }
  })
  return { ...toCustomOrder(row, paid, cost), transactions }
}

export async function addCustomOrder(event: H3Event, input: CustomOrderCreateInput): Promise<CustomOrder> {
  const createdBy = await requireUserId(event)
  const payload: TablesInsert<'custom_orders'> = {
    customer_name: input.customer_name,
    item_name: input.item_name,
    qty: input.qty,
    unit_price: input.unit_price ?? null,
    quoted_price: input.quoted_price,
    due_date: input.due_date ?? null,
    status: input.status ?? 'quote',
    notes: input.notes ?? null,
    created_by: createdBy,
    ...(input.order_date ? { order_date: input.order_date } : {}),
  }
  const row = await createCustomOrder(event, payload)
  await createAuditLog(event, {
    entityType: 'custom_order',
    entityId: row.id,
    action: 'create',
    after: row,
    performedBy: createdBy,
  })
  return toCustomOrder(row)
}

export async function editCustomOrder(
  event: H3Event,
  id: string,
  input: CustomOrderUpdateInput,
): Promise<CustomOrderDetail> {
  const performedBy = await requireUserId(event)
  const before = await getCustomOrderById(event, id)
  const after = await updateCustomOrder(event, id, input as TablesUpdate<'custom_orders'>)
  await createAuditLog(event, {
    entityType: 'custom_order',
    entityId: id,
    action: 'update',
    before,
    after,
    performedBy,
  })
  return getCustomOrder(event, id)
}

export async function removeCustomOrder(event: H3Event, id: string): Promise<void> {
  const performedBy = await requireUserId(event)
  const before = await getCustomOrderById(event, id)
  await deleteCustomOrder(event, id)
  await createAuditLog(event, {
    entityType: 'custom_order',
    entityId: id,
    action: 'delete',
    before,
    performedBy,
  })
}

// Convenience: create a transaction already tagged to this order (income = payment,
// expense = cost). Validates the order exists first, then reuses the normal
// transaction flow (wallet balance is still adjusted atomically).
interface OrderTransactionInput {
  type: 'income' | 'expense'
  amount: number
  wallet_id: string
  category_id: string
  note?: string
  date?: string
}

export async function addOrderTransaction(event: H3Event, orderId: string, input: OrderTransactionInput) {
  await getCustomOrderById(event, orderId) // 404 if the order doesn't exist
  return addTransaction(event, { ...input, custom_order_id: orderId })
}
