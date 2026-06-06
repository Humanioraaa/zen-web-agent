export function useLogout() {
  const supabase = useSupabaseClient()
  const { clearProfile } = useCurrentUser()

  async function logout() {
    try {
      await supabase.auth.signOut()
    } finally {
      clearProfile()
      await navigateTo('/login')
    }
  }

  return { logout }
}
