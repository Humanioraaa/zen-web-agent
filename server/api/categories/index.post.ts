import { addCategory } from '~~/server/services/categoryService'
import { ok } from '~~/server/utils/response'

const VALID_TYPES = ['income', 'expense'] as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }
  if (!VALID_TYPES.includes(body.type)) {
    throw createError({ statusCode: 400, statusMessage: 'type must be income or expense' })
  }

  const category = await addCategory(event, { name, type: body.type })
  setResponseStatus(event, 201)
  return ok(category)
})
