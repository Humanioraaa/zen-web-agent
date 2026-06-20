import { getWalletsTotal } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  return ok(await getWalletsTotal(event))
})
