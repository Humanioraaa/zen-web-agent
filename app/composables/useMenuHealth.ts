import type { MenuHealth } from '~/types/menu'

const LABELS: Record<MenuHealth, string> = {
  safe: 'Aman',
  warning: 'Waspada',
  danger: 'Bahaya',
  unknown: '—',
}

export function useMenuHealth() {
  const healthLabel = (h: MenuHealth) => LABELS[h]
  const healthClass = (h: MenuHealth) => `health--${h}`
  return { healthLabel, healthClass }
}
