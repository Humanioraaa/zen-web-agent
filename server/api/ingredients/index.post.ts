import { z } from 'zod'
import { addIngredient } from '~~/server/services/ingredient-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama bahan wajib diisi'),
  base_unit: z.enum(['ml', 'g', 'pcs']),
  package_size: z.number().positive('Ukuran kemasan harus > 0'),
  package_cost: z.number().min(0, 'Harga kemasan tidak boleh negatif'),
})

export default defineEventHandler(async (event) => {
  const data = await readZodBody(event, schema)
  const ingredient = await addIngredient(event, data)
  setResponseStatus(event, 201)
  return ok(ingredient)
})
