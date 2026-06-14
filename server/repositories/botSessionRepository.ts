import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export type BotState =
  | 'IDLE'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_EDIT'
  | 'AWAITING_EDIT_VALUE'
  | 'AWAITING_PIN'
  | 'AWAITING_CATEGORY_SELECTION'
  | 'AWAITING_SMART_CONFIRM'
  | 'AWAITING_DISAMBIGUATION'
  | 'AWAITING_RESTOCK_QTY'
  | 'AWAITING_RESTOCK_CONFIRM'
  | 'AWAITING_RESTOCK_ANOMALY'

export interface RestockCandidate {
  id: string
  name: string
}

export interface BotSessionContext {
  type: 'expense' | 'income' | 'transfer'
  amount: number
  wallet_id: string
  wallet_to_id: string | null
  category_id: string | null
  item: string | null
  note: string | null
  date: string
  pin_attempts: number
  editing_field: string | null
  // --- Sprint 12 restock fields (set during RESTOCK_*/DISAMBIGUATION states) ---
  kind?: 'restock'
  ingredient_id?: string
  ingredient_name?: string
  base_unit?: string
  qty_value?: number | null
  qty_unit?: 'package' | 'base' | null
  total_cost?: number
  accept_price?: boolean
  candidates?: RestockCandidate[]
}

export interface BotSession {
  telegram_user_id: string
  state: BotState
  context: BotSessionContext | null
  updated_at: string
}

export async function getOrCreateSession(event: H3Event, telegramUserId: string): Promise<BotSession> {
  const client = serverSupabaseServiceRole(event)

  const { data } = await client
    .from('bot_sessions')
    .select('*')
    .eq('telegram_user_id', telegramUserId)
    .single()

  if (data) {
    return {
      telegram_user_id: data.telegram_user_id,
      state: data.state as BotState,
      context: data.context as BotSessionContext | null,
      updated_at: data.updated_at,
    }
  }

  const { data: created, error } = await client
    .from('bot_sessions')
    .insert({ telegram_user_id: telegramUserId, state: 'IDLE' })
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    telegram_user_id: created!.telegram_user_id,
    state: created!.state as BotState,
    context: null,
    updated_at: created!.updated_at,
  }
}

export async function saveSession(event: H3Event, session: BotSession): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const { error } = await client
    .from('bot_sessions')
    .update({
      state: session.state,
      context: session.context as unknown as import('~/types/database.types').Json,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_user_id', session.telegram_user_id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}

export async function clearSession(event: H3Event, telegramUserId: string): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  const { error } = await client
    .from('bot_sessions')
    .update({
      state: 'IDLE',
      context: null,
      updated_at: new Date().toISOString(),
    })
    .eq('telegram_user_id', telegramUserId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
