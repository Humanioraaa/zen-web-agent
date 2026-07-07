import type { ApiItem, ApiArray } from '~/types/base'
import type {
  CustomOrder,
  CustomOrderDetail,
  CustomOrderCreateInput,
  CustomOrderUpdateInput,
  CustomOrderStatus,
} from '~/types/custom-order'

// Income (payment) or expense (cost) to tag onto an order — mirrors the
// server convenience endpoint POST /api/custom-orders/[id]/transactions.
export interface OrderTransactionCreateInput {
  type: 'income' | 'expense'
  amount: number
  wallet_id: string
  category_id: string
  note?: string
  date?: string
}

export function useCustomOrderApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (status?: CustomOrderStatus) =>
    apiFetch<ApiArray<CustomOrder>>('/api/custom-orders', {
      query: status ? { status } : undefined,
    })

  const get = (id: string) =>
    apiFetch<ApiItem<CustomOrderDetail>>(`/api/custom-orders/${id}`)

  const create = (input: CustomOrderCreateInput) =>
    apiFetch<ApiItem<CustomOrder>>('/api/custom-orders', { method: 'POST', body: input })

  const update = (id: string, input: CustomOrderUpdateInput) =>
    apiFetch<ApiItem<CustomOrderDetail>>(`/api/custom-orders/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: boolean }>>(`/api/custom-orders/${id}`, { method: 'DELETE' })

  const addTransaction = (id: string, input: OrderTransactionCreateInput) =>
    apiFetch<ApiItem<{ id: string }>>(`/api/custom-orders/${id}/transactions`, {
      method: 'POST',
      body: input,
    })

  return { list, get, create, update, remove, addTransaction }
}
