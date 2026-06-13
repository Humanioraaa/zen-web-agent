import { removeMenuCategory } from '~~/server/services/menu-category-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeMenuCategory(event, id)
  return ok({ success: true })
})
