import { z } from 'zod'
import { saveStockCounts } from '~~/server/services/stock-count-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  items: z.array(
    z.object({
      item_id: z.string().uuid(),
      counted_qty: z.number().min(0, 'Jumlah tidak boleh negatif'),
      note: z.string().trim().max(200).nullable().optional(),
    }),
  ).min(1, 'Tidak ada baris untuk disimpan'),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const input = await readZodBody(event, schema)
  await saveStockCounts(event, id, input)
  return ok({ saved: input.items.length })
})
