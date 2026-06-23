import { removeStockCount } from '~~/server/services/stock-count-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeStockCount(event, id)
  return ok({ id })
})
