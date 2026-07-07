import { getCustomOrder } from '~~/server/services/custom-order-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const order = await getCustomOrder(event, id)
  return ok(order)
})
