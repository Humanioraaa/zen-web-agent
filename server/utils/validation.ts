import type { H3Event } from 'h3'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
