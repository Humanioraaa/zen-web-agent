import { serverSupabaseClient } from '#supabase/server'
import type { TablesUpdate } from '~/types/database.types'
import type { H3Event } from 'h3'

export interface UserPatchPayload {
  telegram_user_id?: string | null
}

export async function getUserById(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .select('id, email, name, telegram_user_id, onboarding_completed, created_at')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return data
}

export async function getAllUsers(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .select('id, email, name, telegram_user_id, onboarding_completed')
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function updateUser(event: H3Event, id: string, payload: UserPatchPayload) {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('users')
    .update(payload as TablesUpdate<'users'>)
    .eq('id', id)
    .select('id, email, name, telegram_user_id, onboarding_completed')
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
}

export async function markOnboardingComplete(event: H3Event, id: string) {
  const client = await serverSupabaseClient(event)
  const { error } = await client
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
}
