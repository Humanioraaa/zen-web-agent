import type { ApiArray, ApiItem } from '~/types/base'
import type { MenuCategory, MenuCategoryCreateInput, MenuCategoryUpdateInput } from '~/types/menu'

export function useMenuCategoryApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = () => apiFetch<ApiArray<MenuCategory>>('/api/menu-categories')

  const create = (input: MenuCategoryCreateInput) =>
    apiFetch<ApiItem<MenuCategory>>('/api/menu-categories', { method: 'POST', body: input })

  const update = (id: string, input: MenuCategoryUpdateInput) =>
    apiFetch<ApiItem<MenuCategory>>(`/api/menu-categories/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: true }>>(`/api/menu-categories/${id}`, { method: 'DELETE' })

  return { list, create, update, remove }
}
