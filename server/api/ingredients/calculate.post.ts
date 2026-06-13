import { z } from 'zod'
import { calcUnitCost } from '~~/server/services/ingredient-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  package_size: z.number().positive('Ukuran kemasan harus > 0'),
  package_cost: z.number().min(0, 'Harga kemasan tidak boleh negatif'),
})

export default defineEventHandler(async (event) => {
  const { package_size, package_cost } = await readZodBody(event, schema)
  return ok({ unit_cost: calcUnitCost(package_size, package_cost) })
})
