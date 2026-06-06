import { handleUpdate } from '~~/server/services/botService'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const config = useRuntimeConfig()

    if (query.token !== config.telegramBotToken) {
      return { ok: true }
    }

    const body = await readBody(event)
    if (!body) return { ok: true }

    await handleUpdate(event, body)
  } catch (error) {
    console.error('Webhook error:', error)
  }

  return { ok: true }
})
