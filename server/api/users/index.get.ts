import { getUsers } from '~~/server/services/userService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const users = await getUsers(event)
  return ok(users)
})
