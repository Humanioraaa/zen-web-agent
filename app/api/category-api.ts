import type { ApiArray, ApiItem } from '~/types/base'
import type { Category, CategoryType } from '~/types/category'

export function useCategoryApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (type?: CategoryType) =>
    apiFetch<ApiArray<Category>>('/api/categories', {
      query: type ? { type } : {},
    })

  const create = (input: { name: string; type: CategoryType }) =>
    apiFetch<ApiItem<Category>>('/api/categories', { method: 'POST', body: input })

  const update = (id: string, input: { name: string }) =>
    apiFetch<ApiItem<Category>>(`/api/categories/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: true }>>(`/api/categories/${id}`, { method: 'DELETE' })

  return { list, create, update, remove }
}
