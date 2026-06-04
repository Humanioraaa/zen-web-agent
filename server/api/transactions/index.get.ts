import { listTransactions } from '~~/server/services/transactionService'
import { paginated } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const filters = {
    type: query.type as string | undefined,
    wallet_id: query.wallet_id as string | undefined,
    category_id: query.category_id as string | undefined,
    date_from: query.date_from as string | undefined,
    date_to: query.date_to as string | undefined,
    search: query.search as string | undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    offset: query.offset ? Number(query.offset) : undefined,
  }

  const result = await listTransactions(event, filters)
  return paginated(result.data, result.total)
})
