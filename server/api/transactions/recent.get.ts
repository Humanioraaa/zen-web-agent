import { getRecent } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 10
  const transactions = await getRecent(event, limit)
  return ok(transactions)
})
