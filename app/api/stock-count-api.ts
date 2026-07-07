import type { ApiItem, ApiArray } from '~/types/base'
import type {
  StockCountSummary,
  StockCountDetail,
  StockCountCreateInput,
  StockCountSaveInput,
  PeriodSaleLine,
  PeriodSalesSaveInput,
  SalesImportPreview,
} from '~/types/stock-count'

export function useStockCountApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const list = () =>
    apiFetch<ApiArray<StockCountSummary>>('/api/stock-counts')

  const get = (id: string) =>
    apiFetch<ApiItem<StockCountDetail>>(`/api/stock-counts/${id}`)

  const create = (input: StockCountCreateInput = {}) =>
    apiFetch<ApiItem<{ id: string }>>('/api/stock-counts', { method: 'POST', body: input })

  const saveItems = (id: string, input: StockCountSaveInput) =>
    apiFetch<ApiItem<{ saved: number }>>(`/api/stock-counts/${id}/items`, { method: 'PATCH', body: input })

  const finalize = (id: string) =>
    apiFetch<ApiItem<StockCountDetail>>(`/api/stock-counts/${id}/finalize`, { method: 'POST' })

  const remove = (id: string) =>
    apiFetch<ApiItem<{ id: string }>>(`/api/stock-counts/${id}`, { method: 'DELETE' })

  const getSales = (id: string) =>
    apiFetch<ApiArray<PeriodSaleLine>>(`/api/stock-counts/${id}/sales`)

  const saveSales = (id: string, input: PeriodSalesSaveInput) =>
    apiFetch<ApiItem<{ saved: number }>>(`/api/stock-counts/${id}/sales`, { method: 'PUT', body: input })

  const importSales = (id: string, files: string[]) =>
    apiFetch<ApiItem<SalesImportPreview>>(`/api/stock-counts/${id}/sales-import`, { method: 'POST', body: { files } })

  return { list, get, create, saveItems, finalize, remove, getSales, saveSales, importSales }
}
