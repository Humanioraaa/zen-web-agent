import { removeCategory } from '~~/server/services/categoryService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeCategory(event, id)
  return ok({ success: true })
})
