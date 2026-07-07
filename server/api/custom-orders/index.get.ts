import { listCustomOrders } from '~~/server/services/custom-order-service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const status = typeof query.status === 'string' ? query.status : undefined
  const orders = await listCustomOrders(event, status)
  return ok(orders)
})
