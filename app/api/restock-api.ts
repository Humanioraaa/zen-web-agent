import type { ApiItem } from '~/types/base'
import type { RestockPreviewInput, RestockPreview, RestockCommitInput, RestockResult } from '~/types/restock'

export function useRestockApi() {
  // useRequestFetch forwards auth cookies during SSR (plain $fetch does not)
  const apiFetch = useRequestFetch()

  const preview = (input: RestockPreviewInput) =>
    apiFetch<ApiItem<RestockPreview>>('/api/restocks/preview', { method: 'POST', body: input })

  const create = (input: RestockCommitInput) =>
    apiFetch<ApiItem<RestockResult>>('/api/restocks', { method: 'POST', body: input })

  return { preview, create }
}
