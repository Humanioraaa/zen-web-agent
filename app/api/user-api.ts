import type { ApiItem } from '~/types/base'

export function useUserApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const update = (id: string, input: { name?: string; telegram_user_id?: string | null }) =>
    apiFetch<ApiItem<unknown>>(`/api/users/${id}`, { method: 'PATCH', body: input })

  const completeOnboarding = () =>
    apiFetch('/api/users/onboarding-complete', { method: 'POST' })

  return { update, completeOnboarding }
}
