import type { H3Event } from 'h3'
import type { BotSession, BotSessionContext } from '~~/server/repositories/botSessionRepository'

export interface TelegramUpdate {
  message?: {
    from: { id: number }
    chat: { id: number }
    text?: string
  }
  callback_query?: {
    id: string
    from: { id: number }
    message: {
      chat: { id: number }
      message_id: number
    }
    data: string
  }
}

export interface AppUser {
  id: string
  name: string
  telegram_user_id: string | null
}

export type { H3Event, BotSession, BotSessionContext }
