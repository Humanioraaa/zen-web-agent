import type { ApiArray, ApiItem } from '~/types/base'
import type { Ingredient, IngredientCreateInput, IngredientUpdateInput } from '~/types/ingredient'
import type { PriceHistoryPoint } from '~/types/restock'

export function useIngredientApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = (activeOnly = false) =>
    apiFetch<ApiArray<Ingredient>>('/api/ingredients', {
      query: activeOnly ? { active: 'true' } : {},
    })

  const get = (id: string) => apiFetch<ApiItem<Ingredient>>(`/api/ingredients/${id}`)

  const priceHistory = (id: string) =>
    apiFetch<ApiArray<PriceHistoryPoint>>(`/api/ingredients/${id}/price-history`)

  const create = (input: IngredientCreateInput) =>
    apiFetch<ApiItem<Ingredient>>('/api/ingredients', { method: 'POST', body: input })

  const update = (id: string, input: IngredientUpdateInput) =>
    apiFetch<ApiItem<Ingredient>>(`/api/ingredients/${id}`, { method: 'PATCH', body: input })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ success: true }>>(`/api/ingredients/${id}`, { method: 'DELETE' })

  const calcUnitCost = (packageSize: number, packageCost: number) =>
    apiFetch<ApiItem<{ unit_cost: number }>>('/api/ingredients/calculate', {
      method: 'POST',
      body: { package_size: packageSize, package_cost: packageCost },
    })

  return { list, get, priceHistory, create, update, remove, calcUnitCost }
}
