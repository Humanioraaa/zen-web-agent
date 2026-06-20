import type { ApiArray, ApiItem, ApiPaged } from '~/types/base'
import type { TransactionRecord } from '~/types/models'
import type {
  TransactionListFilters,
  TransactionCreateInput,
  TransactionUpdateInput,
} from '~/types/transaction'

export function useTransactionApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (filters?: TransactionListFilters) =>
    apiFetch<ApiPaged<TransactionRecord>>('/api/transactions', {
      query: filters ?? {},
    })

  const recent = () => apiFetch<ApiArray<TransactionRecord>>('/api/transactions/recent')

  const summary = () =>
    apiFetch<ApiItem<{ income: number; expense: number }>>('/api/transactions/summary')

  const create = (input: TransactionCreateInput) =>
    apiFetch<ApiItem<TransactionRecord>>('/api/transactions', { method: 'POST', body: input })

  const update = (id: string, input: TransactionUpdateInput) =>
    apiFetch<ApiItem<TransactionRecord>>(`/api/transactions/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: true }>>(`/api/transactions/${id}`, { method: 'DELETE' })

  return { list, recent, summary, create, update, remove }
}
