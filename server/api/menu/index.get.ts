import { listMenu } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryId = typeof query.category_id === 'string' ? query.category_id : undefined
  const menu = await listMenu(event, categoryId)
  return ok(menu)
})
