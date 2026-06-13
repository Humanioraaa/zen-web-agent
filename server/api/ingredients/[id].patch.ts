import { z } from 'zod'
import { editIngredient } from '~~/server/services/ingredient-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama bahan wajib diisi').optional(),
  base_unit: z.enum(['ml', 'g', 'pcs']).optional(),
  package_size: z.number().positive('Ukuran kemasan harus > 0').optional(),
  package_cost: z.number().min(0, 'Harga kemasan tidak boleh negatif').optional(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const ingredient = await editIngredient(event, id, data)
  return ok(ingredient)
})
