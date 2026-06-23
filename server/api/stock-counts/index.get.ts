import { listStockCounts } from '~~/server/services/stock-count-service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  return ok(await listStockCounts(event))
})
