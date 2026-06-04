import { serverSupabaseClient } from '#supabase/server'
import type { Json } from '~/types/database.types'
import type { H3Event } from 'h3'

interface AuditLogPayload {
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  before?: Json
  after?: Json
  performedBy: string
}

export async function createAuditLog(event: H3Event, payload: AuditLogPayload) {
  const client = await serverSupabaseClient(event)
  const { error } = await client.from('audit_log').insert({
    entity_type: payload.entityType,
    entity_id: payload.entityId,
    action: payload.action,
    before: payload.before ?? null,
    after: payload.after ?? null,
    performed_by: payload.performedBy,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
