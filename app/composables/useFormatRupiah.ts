const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

export function useFormatRupiah() {
  function formatRupiah(amount: number): string {
    return formatter.format(amount)
  }

  function parseRupiah(value: string): number {
    return Number(value.replace(/\D/g, ''))
  }

  return { formatRupiah, parseRupiah }
}
