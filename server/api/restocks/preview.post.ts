import { z } from 'zod'
import { calcRestockPreview } from '~~/server/services/restock-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  ingredient_id: z.string().uuid(),
  qty_value: z.number().positive('Jumlah harus > 0'),
  qty_unit: z.enum(['package', 'base']),
  total_cost: z.number().min(0, 'Total biaya tidak boleh negatif'),
})

export default defineEventHandler(async (event) => {
  const input = await readZodBody(event, schema)
  return ok(await calcRestockPreview(event, input))
})
