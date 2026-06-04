import { setOpeningBalances } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body.balances)) {
    throw createError({ statusCode: 400, statusMessage: 'balances must be an array' })
  }

  const result = await setOpeningBalances(event, body.balances)
  return ok(result)
})
