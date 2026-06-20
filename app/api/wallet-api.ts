import type { ApiArray, ApiItem } from '~/types/base'
import type { Wallet } from '~/types/models'

export function useWalletApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = () => apiFetch<ApiArray<Wallet>>('/api/wallets')

  const summary = () => apiFetch<ApiItem<{ total: number }>>('/api/wallets/summary')

  return { list, summary }
}
