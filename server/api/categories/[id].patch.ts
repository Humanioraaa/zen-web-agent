import { editCategory } from '~~/server/services/categoryService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const body = await readBody(event)

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }

  const category = await editCategory(event, id, { name })
  return ok(category)
})
