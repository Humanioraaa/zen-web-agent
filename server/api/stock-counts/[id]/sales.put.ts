import { z } from 'zod'
import { savePeriodSales } from '~~/server/services/stock-count-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  items: z.array(
    z.object({
      menu_id: z.string().uuid(),
      qty_sold: z.number().min(0, 'Jumlah tidak boleh negatif'),
    }),
  ).min(1, 'Tidak ada baris untuk disimpan'),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const input = await readZodBody(event, schema)
  await savePeriodSales(event, id, input)
  return ok({ saved: input.items.length })
})
