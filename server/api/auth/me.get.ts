import { getCurrentUser } from '~~/server/services/userService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)
  return ok(user)
})
