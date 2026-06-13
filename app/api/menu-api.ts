import type { ApiArray, ApiItem } from '~/types/base'
import type {
  MenuListItem,
  MenuDetail,
  MenuCreateInput,
  MenuUpdateInput,
  RecipeItemInput,
  MenuCalculateInput,
  MenuCalculateResult,
} from '~/types/menu'

export function useMenuApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (categoryId?: string) =>
    apiFetch<ApiArray<MenuListItem>>('/api/menu', { query: categoryId ? { category_id: categoryId } : {} })

  const get = (id: string) => apiFetch<ApiItem<MenuDetail>>(`/api/menu/${id}`)

  const create = (input: MenuCreateInput) =>
    apiFetch<ApiItem<MenuDetail>>('/api/menu', { method: 'POST', body: input })

  const update = (id: string, input: MenuUpdateInput) =>
    apiFetch<ApiItem<MenuDetail>>(`/api/menu/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: true }>>(`/api/menu/${id}`, { method: 'DELETE' })

  const saveRecipe = (id: string, items: RecipeItemInput[]) =>
    apiFetch<ApiItem<MenuDetail>>(`/api/menu/${id}/recipe`, { method: 'PUT', body: { items } })

  const calculate = (input: MenuCalculateInput) =>
    apiFetch<ApiItem<MenuCalculateResult>>('/api/menu/calculate', { method: 'POST', body: input })

  return { list, get, create, update, remove, saveRecipe, calculate }
}
