import { getWallets } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'

export default defineEventHandler(async (event) => {
  const wallets = await getWallets(event)
  return ok(wallets)
})
