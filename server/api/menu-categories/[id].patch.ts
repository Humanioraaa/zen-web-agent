import { z } from 'zod'
import { editMenuCategory } from '~~/server/services/menu-category-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Nama kategori wajib diisi').optional(),
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
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const category = await editMenuCategory(event, id, data)
  return ok(category)
})
