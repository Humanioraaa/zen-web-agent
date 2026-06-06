import { patchUser } from '~~/server/services/userService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const body = (await readBody(event)) ?? {}

  // Whitelist: only telegram_user_id is user-editable in MVP.
  const payload: Record<string, unknown> = {}
  if ('telegram_user_id' in body) {
    const raw = body.telegram_user_id
    payload.telegram_user_id =
      typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
  }

  if (Object.keys(payload).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No editable fields provided' })
  }

  const user = await patchUser(event, id, payload)
  return ok(user)
})
