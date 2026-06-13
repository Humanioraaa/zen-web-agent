import { listIngredients } from '~~/server/services/ingredient-service'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const activeOnly = query.active === 'true'
  const ingredients = await listIngredients(event, activeOnly)
  return ok(ingredients)
})
