import { z } from 'zod'
import { saveIngredientUnits } from '~~/server/services/ingredient-unit-service'
import { ok } from '~~/server/utils/response'
import { readZodBody, requireIdParam } from '~~/server/utils/validation'

// tiers ordered LARGEST → SMALLEST; `per` = how many of the next-smaller tier (base for the last).
const schema = z.object({
  tiers: z
    .array(
      z.object({
        label: z.string().trim().regex(/^[a-zA-Z]+$/, 'Satuan harus satu kata huruf').max(20),
        per: z.number().positive('Jumlah harus lebih dari 0'),
      }),
    )
    .max(6, 'Maksimal 6 tingkat satuan'),
})

export default defineEventHandler(async (event) => {
  const id = requireIdParam(event)
  const { tiers } = await readZodBody(event, schema)
  return ok(await saveIngredientUnits(event, id, tiers))
})
