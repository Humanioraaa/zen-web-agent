import { removeMenu } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  await removeMenu(event, id)
  return ok({ success: true })
})
