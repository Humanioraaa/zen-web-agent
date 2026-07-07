import type { H3Event } from 'h3'
import type { IngredientUnit } from '~/types/ingredient'
import { getIngredientUnits, replaceIngredientUnits } from '../repositories/ingredient-unit-repository'
import { getIngredientById } from '../repositories/ingredient-repository'

type UnitRow = Awaited<ReturnType<typeof getIngredientUnits>>[number]

function toUnit(row: UnitRow): IngredientUnit {
  return {
    id: row.id,
    ingredient_id: row.ingredient_id,
    label: row.label,
    factor_to_base: Number(row.factor_to_base),
    is_base: row.is_base,
    sort_order: row.sort_order,
  }
}

export async function listIngredientUnits(event: H3Event, ingredientId: string): Promise<IngredientUnit[]> {
  const rows = await getIngredientUnits(event, ingredientId)
  return rows.map(toUnit)
}

// Setup input: non-base packaging tiers ordered LARGEST → SMALLEST, each `per` =
// how many of the next-smaller tier fit in 1 of this tier (the last tier's
// next-smaller is the base unit). The base tier (factor 1) is added automatically.
//   Susu UHT (base ml): [{karton, per:12}, {pcs, per:100}] → karton=1200, pcs=100, ml=1
export async function saveIngredientUnits(
  event: H3Event,
  ingredientId: string,
  tiers: { label: string; per: number }[],
): Promise<IngredientUnit[]> {
  const ingredient = await getIngredientById(event, ingredientId) // 404 if missing
  const baseLabel = ingredient.base_unit

  // validate labels: single word, unique, not colliding with base
  const seen = new Set<string>([baseLabel.toLowerCase()])
  for (const t of tiers) {
    const label = t.label.trim()
    if (!/^[a-zA-Z]+$/.test(label)) {
      throw createError({ statusCode: 400, statusMessage: `Nama satuan "${t.label}" harus satu kata huruf` })
    }
    if (!(t.per > 0)) {
      throw createError({ statusCode: 400, statusMessage: `Isi jumlah untuk satuan "${label}" (> 0)` })
    }
    if (seen.has(label.toLowerCase())) {
      throw createError({ statusCode: 400, statusMessage: `Satuan "${label}" dobel / sama dengan satuan dasar` })
    }
    seen.add(label.toLowerCase())
  }

  // compute absolute factors bottom-up (smallest first)
  const smallestFirst = [...tiers].reverse()
  let prev = 1 // base factor
  const computed = smallestFirst.map((t) => {
    const factor = t.per * prev
    prev = factor
    return { label: t.label.trim(), factor_to_base: factor, is_base: false }
  })

  const all = [{ label: baseLabel, factor_to_base: 1, is_base: true }, ...computed]
  // biggest factor → sort_order 0
  all.sort((a, b) => b.factor_to_base - a.factor_to_base)
  const withOrder = all.map((u, i) => ({ ...u, sort_order: i }))

  await replaceIngredientUnits(event, ingredientId, withOrder)
  return listIngredientUnits(event, ingredientId)
}
