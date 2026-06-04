import { serverSupabaseUser } from "#supabase/server";
import type { H3Event } from "h3";
import {
  getUserById,
  getAllUsers,
  updateUser,
  markOnboardingComplete,
} from "../repositories/userRepository";

export async function getCurrentUser(event: H3Event) {
  const authUser = await serverSupabaseUser(event);
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  return getUserById(event, authUser.id);
}

export async function getUsers(event: H3Event) {
  return getAllUsers(event);
}

export async function patchUser(
  event: H3Event,
  id: string,
  payload: Record<string, unknown>,
) {
  const authUser = await serverSupabaseUser(event);
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  if (authUser.id !== id)
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  return updateUser(event, id, payload);
}

export async function completeOnboarding(event: H3Event) {
  const authUser = await serverSupabaseUser(event);
  if (!authUser)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  await markOnboardingComplete(event, authUser.id);
}
