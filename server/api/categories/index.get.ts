import { listCategories } from '~~/server/services/categoryService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type = query.type as string | undefined
  const categories = await listCategories(event, type)
  return ok(categories)
})
