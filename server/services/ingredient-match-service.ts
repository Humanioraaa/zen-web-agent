import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type { IngredientMatchResult, MatchVerdict } from '~/types/restock'
import { matchIngredients } from '../repositories/ingredient-match-repository'

// Minimum similarity to suggest a near-match (tunable). Below this = no match.
export const SUGGEST_MIN = 0.4

// Resolve a parsed name to an exact ingredient, ranked near-candidates, or none.
// Reusable across ingredient resolution, category, and smart learning.
export async function matchIngredient(
  event: H3Event,
  query: string,
  client?: SupabaseClient,
): Promise<IngredientMatchResult> {
  const rows = await matchIngredients(event, query, client)
  if (rows.length === 0) return { verdict: 'none', candidates: [] }

  const normalized = query.trim().toLowerCase()

  const candidates = rows
    .map((r: { id: string; name: string; base_unit: string; similarity: number }) => {
      const name = r.name.toLowerCase()
      let similarity = Number(r.similarity)
      // pg_trgm under-scores a short query against a long/parenthetical name
      // (e.g. "evap" vs "Evap (susu evaporasi)" = 0.31). Boost prefix/substring hits
      // so natural abbreviations resolve. Ties still surface as multiple → disambiguate.
      if (name === normalized) similarity = 1
      else if (name.startsWith(normalized)) similarity = Math.max(similarity, 0.9)
      else if (name.includes(normalized)) similarity = Math.max(similarity, 0.7)
      return { id: r.id, name: r.name, base_unit: r.base_unit, similarity }
    })
    .sort((a: { similarity: number }, b: { similarity: number }) => b.similarity - a.similarity)

  const top = candidates[0]!

  let verdict: MatchVerdict
  if (top.name.toLowerCase() === normalized) verdict = 'exact'
  else if (top.similarity >= SUGGEST_MIN) verdict = 'near'
  else verdict = 'none'

  return { verdict, candidates }
}
