import { z } from 'zod'
import { addOrderTransaction } from '~~/server/services/custom-order-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

// Create an income (payment) or expense (cost) already tagged to this order.
// Transfers are not order-scoped, so only income/expense are accepted here.
const baseFields = {
  amount: z.number().finite().positive('Jumlah harus lebih dari 0'),
  wallet_id: z.string().uuid('Wallet tidak valid'),
  category_id: z.string().uuid('Kategori tidak valid'),
  note: z.string().trim().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').optional(),
}

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('income'), ...baseFields }),
  z.object({ type: z.literal('expense'), ...baseFields }),
])

export default defineEventHandler(async (event) => {
  const orderId = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const transaction = await addOrderTransaction(event, orderId, data)
  setResponseStatus(event, 201)
  return ok(transaction)
})
