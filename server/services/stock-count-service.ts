import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type {
  StockCountSummary,
  StockCountDetail,
  StockCountLine,
  StockCountCreateInput,
  StockCountSaveInput,
  StockCountStatus,
  PeriodSaleLine,
  PeriodSalesSaveInput,
} from '~/types/stock-count'
import {
  createStockCount as repoCreate,
  listStockCounts as repoList,
  getStockCountById,
  getStockCountItems,
  saveStockCountItems,
  updateStockCount,
  deleteStockCount,
} from '../repositories/stock-count-repository'
import { getPeriodSales, upsertPeriodSales } from '../repositories/period-sales-repository'
import { getMenuItems } from '../repositories/menu-item-repository'

function num(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v)
}

// Open a new draft session (server stamps user + date, prefills lines via DB fn).
export async function createDraftStockCount(event: H3Event, input: StockCountCreateInput): Promise<string> {
  const authUser = await serverSupabaseUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const countDate = input.count_date ?? new Date().toISOString().slice(0, 10)
  return repoCreate(event, { created_by: authUser.sub, count_date: countDate, note: input.note ?? null })
}

export async function listStockCounts(event: H3Event): Promise<StockCountSummary[]> {
  const rows = await repoList(event)
  return (rows ?? []).map((r) => {
    const counts = r.stock_count_items as unknown as { count: number }[] | null
    return {
      id: r.id,
      count_date: r.count_date,
      status: r.status as StockCountStatus,
      note: r.note,
      total_value: r.total_value === null ? null : num(r.total_value),
      item_count: counts?.[0]?.count ?? 0,
      finalized_at: r.finalized_at,
      created_at: r.created_at,
    }
  })
}

interface JoinedIngredient {
  name: string
  base_unit: string
  categories: { name: string } | { name: string }[] | null
}

function categoryName(cat: JoinedIngredient['categories']): string | null {
  if (!cat) return null
  return Array.isArray(cat) ? (cat[0]?.name ?? null) : cat.name
}

// Theoretical ingredient usage from period sales: Σ (qty_sold × recipe quantity).
async function buildTheoreticalMap(event: H3Event, stockCountId: string): Promise<Map<string, number> | null> {
  const sales = (await getPeriodSales(event, stockCountId)) ?? []
  const salesMap = new Map<string, number>()
  for (const s of sales) salesMap.set(s.menu_id, num(s.qty_sold))
  // No meaningful sales → no theoretical baseline.
  if (![...salesMap.values()].some((q) => q > 0)) return null

  const menus = await getMenuItems(event)
  const theoretical = new Map<string, number>()
  for (const m of menus ?? []) {
    const qtySold = salesMap.get(m.id) ?? 0
    if (qtySold <= 0) continue
    const recipe = (m.recipe_items ?? []) as unknown as { quantity: number; ingredient_id: string }[]
    for (const ri of recipe) {
      const used = qtySold * num(ri.quantity)
      theoretical.set(ri.ingredient_id, (theoretical.get(ri.ingredient_id) ?? 0) + used)
    }
  }
  return theoretical
}

export async function getStockCountDetail(event: H3Event, id: string): Promise<StockCountDetail> {
  const header = await getStockCountById(event, id)
  const rawItems = await getStockCountItems(event, id)
  const theoretical = await buildTheoreticalMap(event, id)
  const hasSales = theoretical !== null

  const items: StockCountLine[] = (rawItems ?? []).map((row) => {
    const ing = row.ingredients as unknown as JoinedIngredient | null
    const opening = row.opening_qty === null ? null : num(row.opening_qty)
    const purchased = row.purchased_qty === null ? null : num(row.purchased_qty)
    const counted = num(row.counted_qty)
    const unitCost = num(row.unit_cost_snapshot)
    // Period consumption only known once we have a prior baseline (opening + purchased).
    const consumedQty = opening === null || purchased === null ? null : opening + purchased - counted
    // Variance needs both actual consumption and a sales baseline.
    const theoreticalQty = hasSales && consumedQty !== null ? (theoretical!.get(row.ingredient_id) ?? 0) : null
    const varianceQty = theoreticalQty === null || consumedQty === null ? null : consumedQty - theoreticalQty
    return {
      id: row.id,
      ingredient_id: row.ingredient_id,
      ingredient_name: ing?.name ?? '—',
      base_unit: ing?.base_unit ?? '',
      category_name: categoryName(ing?.categories ?? null),
      counted_qty: counted,
      opening_qty: opening,
      purchased_qty: purchased,
      unit_cost_snapshot: unitCost,
      line_value: num(row.line_value),
      consumed_qty: consumedQty,
      consumed_value: consumedQty === null ? null : consumedQty * unitCost,
      theoretical_qty: theoreticalQty,
      variance_qty: varianceQty,
      variance_value: varianceQty === null ? null : varianceQty * unitCost,
      note: row.note,
    }
  })

  // When sales exist, surface biggest variance (the leaks) first; else biggest consumption.
  if (hasSales) {
    items.sort((a, b) => (b.variance_value ?? -Infinity) - (a.variance_value ?? -Infinity)
      || (b.consumed_value ?? -1) - (a.consumed_value ?? -1))
  } else {
    items.sort((a, b) => (b.consumed_value ?? -1) - (a.consumed_value ?? -1) || b.line_value - a.line_value)
  }

  const anyConsumption = items.some((i) => i.consumed_value !== null)
  const totalConsumed = anyConsumption ? items.reduce((sum, i) => sum + (i.consumed_value ?? 0), 0) : null
  const totalTheoretical = hasSales ? items.reduce((sum, i) => sum + (i.theoretical_qty ?? 0) * i.unit_cost_snapshot, 0) : null
  const totalVariance = hasSales ? items.reduce((sum, i) => sum + (i.variance_value ?? 0), 0) : null

  return {
    id: header.id,
    count_date: header.count_date,
    status: header.status as StockCountStatus,
    note: header.note,
    total_value: header.total_value === null ? null : num(header.total_value),
    total_consumed_value: totalConsumed,
    total_theoretical_value: totalTheoretical,
    total_variance_value: totalVariance,
    has_sales: hasSales,
    finalized_at: header.finalized_at,
    created_at: header.created_at,
    items,
  }
}

// Sales-entry form: every active menu with its current entered qty (0 default).
export async function getPeriodSalesForm(event: H3Event, id: string): Promise<PeriodSaleLine[]> {
  await getStockCountById(event, id) // 404 guard
  const menus = await getMenuItems(event)
  const sales = (await getPeriodSales(event, id)) ?? []
  const qtyMap = new Map<string, number>()
  for (const s of sales) qtyMap.set(s.menu_id, num(s.qty_sold))

  return (menus ?? [])
    .filter((m) => m.is_active)
    .map((m) => {
      const cat = m.menu_categories as unknown as { name: string } | { name: string }[] | null
      return {
        menu_id: m.id,
        menu_name: m.name,
        category_name: Array.isArray(cat) ? (cat[0]?.name ?? null) : (cat?.name ?? null),
        qty_sold: qtyMap.get(m.id) ?? 0,
      }
    })
}

export async function savePeriodSales(event: H3Event, id: string, input: PeriodSalesSaveInput): Promise<void> {
  await getStockCountById(event, id) // 404 guard
  await upsertPeriodSales(event, id, input.items)
}

export async function saveStockCounts(event: H3Event, id: string, input: StockCountSaveInput): Promise<void> {
  const header = await getStockCountById(event, id)
  if (header.status !== 'draft') {
    throw createError({ statusCode: 409, statusMessage: 'Sesi sudah final, tidak bisa diubah' })
  }
  await saveStockCountItems(event, input.items)
}

// Lock the session: snapshot total on-hand value, mark finalized.
export async function finalizeStockCount(event: H3Event, id: string): Promise<StockCountDetail> {
  const header = await getStockCountById(event, id)
  if (header.status !== 'draft') {
    throw createError({ statusCode: 409, statusMessage: 'Sesi sudah final' })
  }
  const items = await getStockCountItems(event, id)
  const totalValue = (items ?? []).reduce((sum, r) => sum + num(r.line_value), 0)
  await updateStockCount(event, id, {
    status: 'finalized',
    finalized_at: new Date().toISOString(),
    total_value: totalValue,
  })
  return getStockCountDetail(event, id)
}

export async function removeStockCount(event: H3Event, id: string): Promise<void> {
  await deleteStockCount(event, id)
}
