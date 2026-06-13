import { z } from 'zod'
import { editMenu } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  name: z.string().trim().min(1, 'Nama menu wajib diisi').optional(),
  category_id: z.string().uuid('Kategori tidak valid').optional(),
  selling_price: z.number().min(0, 'Harga jual tidak boleh negatif').optional(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const menu = await editMenu(event, id, data)
  return ok(menu)
})
