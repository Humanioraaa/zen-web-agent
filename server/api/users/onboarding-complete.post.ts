import { completeOnboarding } from '~~/server/services/userService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  await completeOnboarding(event)
  return ok({ success: true })
})
