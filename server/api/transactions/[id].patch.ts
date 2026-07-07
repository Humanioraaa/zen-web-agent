import { z } from 'zod'
import { editTransaction } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

// Partial update. Unknown keys (e.g. `type`) are stripped by Zod — type cannot be changed.
// `amount` must stay positive so it can't corrupt wallet-balance arithmetic.
const schema = z.object({
  amount: z.number().finite().positive('Jumlah harus lebih dari 0').optional(),
  wallet_id: z.string().uuid('Wallet tidak valid').optional(),
  wallet_to_id: z.string().uuid('Wallet tujuan tidak valid').nullable().optional(),
  category_id: z.string().uuid('Kategori tidak valid').nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').optional(),
  custom_order_id: z.string().uuid('Pesanan tidak valid').nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const transaction = await editTransaction(event, id, data)
  return ok(transaction)
})
