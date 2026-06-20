import { z } from 'zod'
import { addTransaction } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const baseFields = {
  amount: z.number().finite().positive('Jumlah harus lebih dari 0'),
  wallet_id: z.string().uuid('Wallet tidak valid'),
  note: z.string().trim().max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').optional(),
  source: z.enum(['web', 'telegram']).optional(),
}

// Transfer needs a destination wallet; income/expense need a category.
const schema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('transfer'), ...baseFields, wallet_to_id: z.string().uuid('Wallet tujuan tidak valid') }),
    z.object({ type: z.literal('income'), ...baseFields, category_id: z.string().uuid('Kategori tidak valid') }),
    z.object({ type: z.literal('expense'), ...baseFields, category_id: z.string().uuid('Kategori tidak valid') }),
  ])
  .superRefine((data, ctx) => {
    if (data.type === 'transfer' && data.wallet_to_id === data.wallet_id) {
      ctx.addIssue({ code: 'custom', message: 'Wallet tujuan harus berbeda dari wallet asal', path: ['wallet_to_id'] })
    }
  })

export default defineEventHandler(async (event) => {
  const data = await readZodBody(event, schema)
  const transaction = await addTransaction(event, data)
  setResponseStatus(event, 201)
  return ok(transaction)
})
