import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'
import type { UserPatchPayload } from '../repositories/userRepository'
import {
  getUserById,
  getAllUsers,
  updateUser,
  markOnboardingComplete,
} from '../repositories/userRepository'

export async function getCurrentUser(event: H3Event) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return getUserById(event, authUser.sub)
}

export async function getUsers(event: H3Event) {
  return getAllUsers(event)
}

export async function patchUser(
  event: H3Event,
  id: string,
  payload: UserPatchPayload,
) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  if (authUser.sub !== id)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  return updateUser(event, id, payload)
}

export async function completeOnboarding(event: H3Event) {
  const authUser = await serverSupabaseUser(event)
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  await markOnboardingComplete(event, authUser.sub)
}
