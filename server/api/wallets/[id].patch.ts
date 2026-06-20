import { z } from 'zod'
import { patchWallet } from '~~/server/services/walletService'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama wallet wajib diisi').max(100).optional(),
  balance: z.number().finite('Saldo tidak valid').optional(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const wallet = await patchWallet(event, id, data)
  return ok(wallet)
})
