import { z } from 'zod'
import { createDraftStockCount } from '~~/server/services/stock-count-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  count_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid').optional(),
  note: z.string().trim().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const input = await readZodBody(event, schema)
  const id = await createDraftStockCount(event, input)
  setResponseStatus(event, 201)
  return ok({ id })
})
