import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, AppUser, BotSession } from './types'
import { saveSession, clearSession } from '~~/server/repositories/botSessionRepository'
import { calcRestockPreview, commitRestockForBot } from '~~/server/services/restock-service'
import {
  sendMessage,
  restockConfirmKeyboard,
  restockAnomalyKeyboard,
} from '~~/server/services/telegramService'
import { formatRupiah } from '~~/server/utils/formatRupiah'
import type { RestockPreview } from '~/types/restock'

const PIN_THRESHOLD = 500_000

// Parse a quantity reply like "2 pack", "2 kemasan", "2000 ml", "1 kg", or bare "2".
export function parseQty(text: string): { qty_value: number; qty_unit: 'package' | 'base' } | null {
  const m = text.trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*([a-z]+)?/)
  if (!m) return null
  const value = parseFloat(m[1]!.replace(',', '.'))
  if (!isFinite(value) || value <= 0) return null
  const unit = m[2] ?? ''

  const baseUnits: Record<string, number> = { ml: 1, l: 1000, liter: 1000, ltr: 1000, g: 1, gr: 1, gram: 1, kg: 1000, pcs: 1, pc: 1, buah: 1 }
  if (unit in baseUnits) {
    return { qty_value: value * baseUnits[unit]!, qty_unit: 'base' }
  }
  // pack / kemasan / botol / sak / dus / karton / bare number → package
  return { qty_value: value, qty_unit: 'package' }
}

function previewText(p: RestockPreview): string {
  let t = `🛒 Restock <b>${p.ingredient_name}</b>\n`
  t += `${p.packages} kemasan · ${formatRupiah(p.package_cost)}/kemasan\n`
  t += `Biaya satuan: ${formatRupiah(p.unit_cost)} / ${p.base_unit}`
  if (p.pct_change !== null) {
    const sign = p.pct_change > 0 ? '+' : ''
    t += `\nvs harga terakhir ${formatRupiah(p.last_package_cost)} (${sign}${p.pct_change}%)`
  }
  return t
}

// Entry point: ingredient resolved + total cost known. Ask qty if missing, else preview.
export async function startRestockFlow(
  event: H3Event,
  session: BotSession,
  chatId: number,
  data: {
    ingredient_id: string
    ingredient_name: string
    base_unit: string
    total_cost: number
    wallet_id: string
    qty_value: number | null
    qty_unit: 'package' | 'base' | null
  },
): Promise<void> {
  session.state = 'AWAITING_RESTOCK_QTY'
  session.context = {
    type: 'expense',
    amount: data.total_cost,
    wallet_id: data.wallet_id,
    wallet_to_id: null,
    category_id: null,
    item: data.ingredient_name,
    note: null,
    date: new Date().toISOString().slice(0, 10),
    pin_attempts: 0,
    editing_field: null,
    kind: 'restock',
    ingredient_id: data.ingredient_id,
    ingredient_name: data.ingredient_name,
    base_unit: data.base_unit,
    qty_value: data.qty_value,
    qty_unit: data.qty_unit,
    total_cost: data.total_cost,
    accept_price: false,
  }

  if (data.qty_value && data.qty_unit) {
    await presentPreview(event, session, chatId)
    return
  }

  await saveSession(event, session)
  await sendMessage(
    chatId,
    `Berapa <b>${data.ingredient_name}</b> yang dibeli?\nContoh: <code>2 pack</code> atau <code>2000 ml</code>`,
  )
}

// Quantity text reply during AWAITING_RESTOCK_QTY.
export async function handleRestockQtyInput(
  event: H3Event,
  session: BotSession,
  chatId: number,
  text: string,
): Promise<void> {
  const qty = parseQty(text)
  if (!qty) {
    await sendMessage(chatId, 'Format jumlah tidak jelas. Contoh: 2 pack, 2 kemasan, 2000 ml')
    return
  }
  if (session.context) {
    session.context.qty_value = qty.qty_value
    session.context.qty_unit = qty.qty_unit
  }
  await presentPreview(event, session, chatId)
}

// Compute the BE preview and route to confirm (normal/baseline) or anomaly.
export async function presentPreview(event: H3Event, session: BotSession, chatId: number): Promise<void> {
  const ctx = session.context
  if (!ctx || !ctx.ingredient_id || !ctx.qty_value || !ctx.qty_unit || ctx.total_cost == null) return

  const client = serverSupabaseServiceRole(event)
  const preview = await calcRestockPreview(
    event,
    {
      ingredient_id: ctx.ingredient_id,
      qty_value: ctx.qty_value,
      qty_unit: ctx.qty_unit,
      total_cost: ctx.total_cost,
    },
    client,
  )

  if (preview.verdict === 'anomaly') {
    session.state = 'AWAITING_RESTOCK_ANOMALY'
    await saveSession(event, session)
    const dir = preview.direction ?? 'naik'
    await sendMessage(
      chatId,
      `${previewText(preview)}\n\n⚠️ Harga ${dir} ${Math.abs(preview.pct_change ?? 0)}% (lebih dari ambang ${preview.threshold_pct}%). Kenapa?`,
      restockAnomalyKeyboard(dir),
    )
    return
  }

  // baseline or normal → straight to confirm
  session.state = 'AWAITING_RESTOCK_CONFIRM'
  await saveSession(event, session)
  await sendMessage(chatId, `${previewText(preview)}\n\nSimpan?`, restockConfirmKeyboard())
}

// Commit (or require PIN for large totals). Called from confirm / anomaly callbacks.
export async function commitOrPin(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
): Promise<void> {
  const ctx = session.context
  if (!ctx || ctx.total_cost == null) return

  if (ctx.total_cost > PIN_THRESHOLD) {
    session.state = 'AWAITING_PIN'
    ctx.pin_attempts = 0
    await saveSession(event, session)
    await sendMessage(chatId, 'Masukkan PIN untuk konfirmasi restock ini:')
    return
  }

  await finalizeRestock(event, user, session, chatId)
}

// Actually write the restock and report. Called after confirm or successful PIN.
export async function finalizeRestock(
  event: H3Event,
  user: AppUser,
  session: BotSession,
  chatId: number,
): Promise<void> {
  const ctx = session.context
  if (!ctx || !ctx.ingredient_id || !ctx.qty_value || !ctx.qty_unit || ctx.total_cost == null) return

  const result = await commitRestockForBot(
    event,
    {
      ingredient_id: ctx.ingredient_id,
      qty_value: ctx.qty_value,
      qty_unit: ctx.qty_unit,
      total_cost: ctx.total_cost,
      wallet_id: ctx.wallet_id,
      accept_price: ctx.accept_price === true,
    },
    user.id,
  )

  await clearSession(event, session.telegram_user_id)

  const priceMsg = result.applied
    ? `Harga bahan diperbarui: ${formatRupiah(result.package_cost)}/kemasan`
    : 'Harga bahan dibiarkan (tidak diubah)'
  await sendMessage(chatId, `✅ Restock <b>${ctx.ingredient_name}</b> dicatat.\n${priceMsg}`)
}
