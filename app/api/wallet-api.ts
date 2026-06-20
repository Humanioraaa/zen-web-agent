import type { ApiArray, ApiItem } from '~/types/base'
import type { Wallet } from '~/types/models'

export function useWalletApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = () => apiFetch<ApiArray<Wallet>>('/api/wallets')

  const summary = () => apiFetch<ApiItem<{ total: number }>>('/api/wallets/summary')

  const update = (id: string, input: { name?: string; balance?: number; is_active?: boolean }) =>
    apiFetch<ApiItem<Wallet>>(`/api/wallets/${id}`, { method: 'PATCH', body: input })

  const openingBalances = (balances: Array<{ wallet_id: string; amount: number }>) =>
    apiFetch<ApiItem<{ updated: number }>>('/api/wallets/opening-balances', {
      method: 'POST',
      body: { balances },
    })

  return { list, summary, update, openingBalances }
}
