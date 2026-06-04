import { patchWallet } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const wallet = await patchWallet(event, id, body)
  return ok(wallet)
})
