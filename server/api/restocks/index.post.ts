import { z } from 'zod'
import { commitRestock } from '~~/server/services/restock-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  ingredient_id: z.string().uuid(),
  qty_value: z.number().positive('Jumlah harus > 0'),
  qty_unit: z.enum(['package', 'base']),
  total_cost: z.number().min(0, 'Total biaya tidak boleh negatif'),
  wallet_id: z.string().uuid('Wallet wajib dipilih'),
  accept_price: z.boolean().optional(),
  category_id: z.string().uuid().optional(),
  note: z.string().trim().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const input = await readZodBody(event, schema)
  const result = await commitRestock(event, input)
  setResponseStatus(event, 201)
  return ok(result)
})
