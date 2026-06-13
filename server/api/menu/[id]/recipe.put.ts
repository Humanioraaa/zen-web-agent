import { z } from 'zod'
import { saveRecipe } from '~~/server/services/menu-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

const schema = z.object({
  items: z
    .array(
      z.object({
        ingredient_id: z.string().uuid('Bahan tidak valid'),
        quantity: z.number().positive('Jumlah harus > 0'),
      }),
    )
    .superRefine((items, ctx) => {
      const seen = new Set<string>()
      for (const it of items) {
        if (seen.has(it.ingredient_id)) {
          ctx.addIssue({ code: 'custom', message: 'Bahan tidak boleh dobel dalam satu resep' })
          return
        }
        seen.add(it.ingredient_id)
      }
    }),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const data = await readZodBody(event, schema)
  const menu = await saveRecipe(event, id, data.items)
  return ok(menu)
})
