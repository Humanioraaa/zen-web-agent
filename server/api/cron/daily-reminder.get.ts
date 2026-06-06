import { serverSupabaseServiceRole } from '#supabase/server'
import { getUsersWithTelegram } from '~~/server/repositories/userRepository'
import { sendMessage } from '~~/server/services/telegramService'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authorization = getHeader(event, 'authorization')

  if (authorization !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const client = serverSupabaseServiceRole(event)
  const users = await getUsersWithTelegram(event, client)

  let sent = 0
  for (const user of users) {
    if (!user.telegram_user_id) continue
    try {
      const name = user.name ?? 'Kak'
      await sendMessage(
        user.telegram_user_id,
        `🕕 Hai ${name}! Jangan lupa catat pengeluaran hari ini ya.\n\nKetik langsung di sini, contoh: "beli gula 15k"`,
      )
      sent++
    } catch (error) {
      console.error(`Failed to send reminder to ${user.telegram_user_id}:`, error)
    }
  }

  return { data: { sent } }
})
