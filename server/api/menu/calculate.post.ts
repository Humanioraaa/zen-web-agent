import { z } from 'zod'
import { calculatePreview } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  category_id: z.string().uuid('Kategori tidak valid'),
  selling_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
  items: z.array(
    z.object({
      ingredient_id: z.string().uuid('Bahan tidak valid'),
      quantity: z.number().positive('Jumlah harus > 0'),
    }),
  ),
})

export default defineEventHandler(async (event) => {
  const data = await readZodBody(event, schema)
  const result = await calculatePreview(event, data)
  return ok(result)
})
