import type { CustomOrderStatus } from '~/types/custom-order'

// Indonesian labels for the customer-facing status pipeline.
const LABELS: Record<CustomOrderStatus, string> = {
  quote: 'Penawaran',
  confirmed: 'Deal',
  in_progress: 'Proses',
  done: 'Selesai',
  cancelled: 'Batal',
}

// Pipeline order (also drives the status filter tabs).
const ORDER: CustomOrderStatus[] = ['quote', 'confirmed', 'in_progress', 'done', 'cancelled']

export function useCustomOrderStatus() {
  const label = (s: CustomOrderStatus): string => LABELS[s] ?? s
  const options = ORDER.map((value) => ({ value, label: LABELS[value] }))
  return { label, options, ORDER }
}
