import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Parses + validates the request body against a Zod schema; throws 400 on failure.
export async function readZodBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid input',
    })
  }
  return parsed.data
}

export function requireIdParam(event: H3Event): string {
  const id = getRouterParam(event, 'id')
  if (!id || !UUID_PATTERN.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid ID format' })
  }
  return id
}

export function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&')
}
