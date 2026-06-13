import { removeIngredient } from '~~/server/services/ingredient-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeIngredient(event, id)
  return ok({ success: true })
})
