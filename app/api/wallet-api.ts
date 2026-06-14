import type { ApiArray } from '~/types/base'
import type { Wallet } from '~/types/models'

export function useWalletApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = () => apiFetch<ApiArray<Wallet>>('/api/wallets')

  return { list }
}
