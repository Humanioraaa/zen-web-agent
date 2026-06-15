import type { ApiArray } from '~/types/base'
import type { Category, CategoryType } from '~/types/category'

export function useCategoryApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (type?: CategoryType) =>
    apiFetch<ApiArray<Category>>('/api/categories', {
      query: type ? { type } : {},
    })

  return { list }
}
