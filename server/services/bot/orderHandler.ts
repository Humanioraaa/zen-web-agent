import type { SupabaseClient } from '@supabase/supabase-js'
import type { H3Event } from './types'
import { getCustomOrders } from '~~/server/repositories/custom-order-repository'
import { sendMessage, customOrderKeyboard } from '~~/server/services/telegramService'

const ACTIVE_STATUSES = ['quote', 'confirmed', 'in_progress']

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

// /pesanan — list active custom orders as inline buttons for tagging.
// Never creates an order (rule #8): if none exist, point the owner to the web app.
export async function startOrderTagFlow(
  event: H3Event,
  chatId: number,
  client: SupabaseClient,
): Promise<void> {
  const all = await getCustomOrders(event, undefined, client)
  const active = all.filter((o) => ACTIVE_STATUSES.includes(o.status)).slice(0, 10)

  if (active.length === 0) {
    await sendMessage(chatId, '📦 Belum ada pesanan custom aktif. Buat dulu di web app (menu Pesanan Custom).')
    return
  }

  const orders = active.map((o) => ({
    id: o.id,
    label: truncate(`${o.item_name} · ${o.customer_name}`, 48),
  }))
  await sendMessage(chatId, '📦 Pilih pesanan untuk catat pembayaran/biaya:', customOrderKeyboard(orders))
}
