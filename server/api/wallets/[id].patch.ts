import { patchWallet } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const body = await readBody(event)
  const wallet = await patchWallet(event, id, body)
  return ok(wallet)
})
