export interface UserProfile {
  id: string
  email: string
  name: string
  telegram_user_id: string | null
  onboarding_completed: boolean
  created_at: string
}

export function useCurrentUser() {
  const profile = useState<UserProfile | null>('currentUser', () => null)

  async function fetchProfile(): Promise<UserProfile> {
    const response = await $fetch<{ data: UserProfile }>('/api/auth/me')
    profile.value = response.data
    return response.data
  }

  function clearProfile() {
    profile.value = null
  }

  return { profile, fetchProfile, clearProfile }
}
