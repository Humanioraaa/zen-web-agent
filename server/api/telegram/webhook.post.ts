import { timingSafeEqual } from 'node:crypto'
import { handleUpdate } from '~~/server/services/bot'

// Telegram echoes the secret set via setWebhook(secret_token) in this header on every call.
// Authenticating here (instead of a ?token= query param) keeps the secret out of access logs.
function secretMatches(received: string | undefined, expected: string): boolean {
  if (!expected || !received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()

    const secret = getHeader(event, 'x-telegram-bot-api-secret-token')
    if (!secretMatches(secret, config.telegramWebhookSecret)) {
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
