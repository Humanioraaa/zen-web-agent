import { getMenuDetail } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { requireIdParam } from '~~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const menu = await getMenuDetail(event, id)
  return ok(menu)
})
