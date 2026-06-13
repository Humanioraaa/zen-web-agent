import { z } from 'zod'
import { addMenuCategory } from '~~/server/services/menu-category-service'
import { ok } from '~~/server/utils/response'
import { readZodBody } from '~~/server/utils/validation'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Nama kategori wajib diisi'),
    sort_order: z.number().int().optional(),
    safe_threshold: z.number().min(0).max(100).optional(),
    warning_threshold: z.number().min(0).max(100).optional(),
  })
  .refine(
    (d) =>
      d.safe_threshold === undefined ||
      d.warning_threshold === undefined ||
      d.warning_threshold <= d.safe_threshold,
    { message: 'warning_threshold harus <= safe_threshold', path: ['warning_threshold'] },
  )

export default defineEventHandler(async (event) => {
  const data = await readZodBody(event, schema)
  const category = await addMenuCategory(event, data)
  setResponseStatus(event, 201)
  return ok(category)
})
