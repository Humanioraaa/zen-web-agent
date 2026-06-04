export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const SKIP_PATHS = ['/login', '/onboarding', '/confirm']

  if (!user.value || SKIP_PATHS.includes(to.path)) return

  const checked = useState('onboardingChecked', () => false)
  if (checked.value) return

  try {
    const response = await $fetch<{ data: { onboarding_completed: boolean } }>('/api/auth/me')
    checked.value = true
    if (!response.data.onboarding_completed) return navigateTo('/onboarding')
  } catch {
    checked.value = true
  }
})
