export function formatRupiah(amount: number): string {
  const formatted = Math.abs(amount)
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return amount < 0 ? `-Rp${formatted}` : `Rp${formatted}`
}
