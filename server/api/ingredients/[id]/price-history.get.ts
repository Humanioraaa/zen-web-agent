import { listPriceHistory } from '~~/server/services/restock-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  return ok(await listPriceHistory(event, id))
})
