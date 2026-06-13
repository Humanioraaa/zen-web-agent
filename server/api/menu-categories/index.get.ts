import { listMenuCategories } from '~~/server/services/menu-category-service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const categories = await listMenuCategories(event)
  return ok(categories)
})
