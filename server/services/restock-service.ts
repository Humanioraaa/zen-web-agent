import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import type {
  RestockPreviewInput,
  RestockPreview,
  RestockCommitInput,
  RestockResult,
  QtyUnit,
  AnomalyVerdict,
  AnomalyDirection,
  PriceHistoryPoint,
} from '~/types/restock'
import { getIngredientById } from '../repositories/ingredient-repository'
import { createRestock } from '../repositories/restock-repository'
import { getPriceHistory } from '../repositories/price-history-repository'

// Global anomaly threshold (%). Per-ingredient override lives on ingredients.price_alert_threshold_pct.
export const GLOBAL_THRESHOLD_PCT = 20

// Buying fewer than this many packages is almost always a mis-parsed qty (e.g. "1 butir"
// read as 1 gram → 0.0004 packages → an absurd per-unit cost that poisons every recipe's
// HPP). Flag it so the owner must confirm/re-enter instead of committing silently.
export const MIN_PACKAGES = 0.01

function round(value: number, dp = 4): number {
  const factor = 10 ** dp
  return Math.round(value * factor) / factor
}

// Resolve how many packages a quantity represents (qty in base units ÷ package size).
function computePackages(qtyValue: number, qtyUnit: QtyUnit, packageSize: number): number {
  if (qtyUnit === 'package') return qtyValue
  if (packageSize <= 0) return 0
  return qtyValue / packageSize
}

interface PriceMath {
  packages: number
  package_cost: number
  unit_cost: number
  pct_change: number | null
  verdict: AnomalyVerdict
  direction: AnomalyDirection
  threshold_pct: number
  last_package_cost: number
  package_size: number
  qty_suspect: boolean
}

function computePriceMath(
  input: RestockPreviewInput,
  ingredient: { package_size: number; package_cost: number; price_alert_threshold_pct: number | null },
): PriceMath {
  const packageSize = Number(ingredient.package_size)
  const lastPackageCost = Number(ingredient.package_cost)
  const threshold = ingredient.price_alert_threshold_pct ?? GLOBAL_THRESHOLD_PCT

  const packages = computePackages(input.qty_value, input.qty_unit, packageSize)
  if (packages <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Jumlah tidak valid' })
  }
  const packageCost = input.total_cost / packages
  const unitCost = packageSize > 0 ? packageCost / packageSize : 0

  let pctChange: number | null = null
  let verdict: AnomalyVerdict
  let direction: AnomalyDirection = null

  if (!lastPackageCost || lastPackageCost <= 0) {
    verdict = 'baseline'
  } else {
    pctChange = round(((packageCost - lastPackageCost) / lastPackageCost) * 100, 2)
    if (Math.abs(pctChange) > threshold) {
      verdict = 'anomaly'
      direction = pctChange > 0 ? 'naik' : 'turun'
    } else {
      verdict = 'normal'
    }
  }

  // An absurdly-tiny package count means a mis-parsed qty → never commit it silently,
  // even on a baseline (fresh) ingredient. Force the anomaly-confirm path so the owner
  // sees it + can re-enter the qty.
  const qtySuspect = packages < MIN_PACKAGES
  if (qtySuspect) verdict = 'anomaly'

  return {
    packages: round(packages),
    package_cost: round(packageCost),
    unit_cost: round(unitCost),
    pct_change: pctChange,
    verdict,
    direction,
    threshold_pct: threshold,
    last_package_cost: lastPackageCost,
    package_size: packageSize,
    qty_suspect: qtySuspect,
  }
}

export async function calcRestockPreview(
  event: H3Event,
  input: RestockPreviewInput,
  client?: SupabaseClient,
): Promise<RestockPreview> {
  const ing = await getIngredientById(event, input.ingredient_id, client)
  const m = computePriceMath(input, ing)
  return {
    ingredient_id: ing.id,
    ingredient_name: ing.name,
    base_unit: ing.base_unit,
    packages: m.packages,
    package_cost: m.package_cost,
    unit_cost: m.unit_cost,
    last_package_cost: m.last_package_cost,
    pct_change: m.pct_change,
    verdict: m.verdict,
    direction: m.direction,
    threshold_pct: m.threshold_pct,
    qty_suspect: m.qty_suspect,
  }
}

// Shared commit core — recomputes server-side, never trusts client math.
async function commitCore(
  event: H3Event,
  input: RestockCommitInput,
  createdBy: string,
  source: string,
  client?: SupabaseClient,
): Promise<RestockResult> {
  const ing = await getIngredientById(event, input.ingredient_id, client)
  const m = computePriceMath(input, ing)

  // Update current price unless it's an anomaly the owner did not accept.
  const applyPrice = m.verdict === 'anomaly' ? input.accept_price === true : true

  // Label the expense so the ledger is readable (was showing blank "—").
  const note = input.note ?? `Restock ${ing.name} (${m.packages} kemasan)`

  return createRestock(event, {
    ingredient_id: input.ingredient_id,
    qty_value: input.qty_value,
    qty_unit: input.qty_unit,
    packages: m.packages,
    total_cost: input.total_cost,
    package_cost: m.package_cost,
    package_size_at_time: m.package_size,
    pct_change: m.pct_change,
    apply_price: applyPrice,
    wallet_id: input.wallet_id,
    // Restock expense inherits the ingredient's expense category (Sprint 13 Part A).
    // Falls back to any explicitly-passed category, then null.
    category_id: ing.category_id ?? input.category_id ?? null,
    created_by: createdBy,
    source,
    date: new Date().toISOString().slice(0, 10),
    note,
  }, client)
}

// Web path — resolves the session user.
export async function commitRestock(event: H3Event, input: RestockCommitInput): Promise<RestockResult> {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return commitCore(event, input, authUser.sub, 'web')
}

// Bot path — caller supplies the user id; uses the service-role client.
export async function commitRestockForBot(
  event: H3Event,
  input: RestockCommitInput,
  createdBy: string,
): Promise<RestockResult> {
  const client = serverSupabaseServiceRole(event)
  return commitCore(event, input, createdBy, 'telegram', client)
}

export async function listPriceHistory(event: H3Event, ingredientId: string): Promise<PriceHistoryPoint[]> {
  const rows = await getPriceHistory(event, ingredientId)
  return rows.map((r) => ({
    id: r.id,
    package_cost: Number(r.package_cost),
    unit_cost: Number(r.unit_cost),
    pct_change: r.pct_change === null ? null : Number(r.pct_change),
    source: r.source as PriceHistoryPoint['source'],
    created_at: r.created_at,
  }))
}
