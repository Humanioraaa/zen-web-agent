import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event, TelegramUpdate, AppUser } from './types'
import {
  getOrCreateSession,
} from '~~/server/repositories/botSessionRepository'
import { findByTelegramId } from '~~/server/repositories/userRepository'
import { answerCallbackQuery } from '~~/server/services/telegramService'
import { handleTextMessage } from './messageHandler'
import { handleCallbackQuery } from './callbackHandler'

export async function handleUpdate(event: H3Event, update: TelegramUpdate): Promise<void> {
  const client = serverSupabaseServiceRole(event)
  let telegramUserId: number
  let chatId: number

  if (update.callback_query) {
    telegramUserId = update.callback_query.from.id
    chatId = update.callback_query.message.chat.id
  } else if (update.message) {
    telegramUserId = update.message.from.id
    chatId = update.message.chat.id
  } else {
    return
  }

  const user = await findByTelegramId(event, String(telegramUserId), client)
  if (!user) return

  const session = await getOrCreateSession(event, String(telegramUserId))

  if (update.callback_query) {
    await answerCallbackQuery(update.callback_query.id)
    await handleCallbackQuery(
      event,
      user as AppUser,
      session,
      chatId,
      update.callback_query.data,
      update.callback_query.message.message_id,
    )
  } else if (update.message?.text) {
    await handleTextMessage(event, user as AppUser, session, chatId, update.message.text)
  }
}
