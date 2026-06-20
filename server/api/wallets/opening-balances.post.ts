import { z } from 'zod'
import { setOpeningBalances } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  balances: z
    .array(
      z.object({
        wallet_id: z.string().uuid('Wallet tidak valid'),
        amount: z.number().finite('Saldo tidak valid'),
      }),
    )
    .min(1, 'Minimal satu saldo'),
})

export default defineEventHandler(async (event) => {
  const { balances } = await readZodBody(event, schema)
  const result = await setOpeningBalances(event, balances)
  return ok(result)
})
