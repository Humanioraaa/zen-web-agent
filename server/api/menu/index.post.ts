import { z } from 'zod'
import { addMenu } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama menu wajib diisi'),
  category_id: z.string().uuid('Kategori tidak valid'),
  selling_price: z.number().min(0, 'Harga jual tidak boleh negatif'),
})

export default defineEventHandler(async (event) => {
  const data = await readZodBody(event, schema)
  const menu = await addMenu(event, data)
  setResponseStatus(event, 201)
  return ok(menu)
})
