import { getSummary } from '~~/server/services/transactionService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const date = (query.date as string) ?? new Date().toISOString().split('T')[0]
  const summary = await getSummary(event, date)
  return ok(summary)
})
