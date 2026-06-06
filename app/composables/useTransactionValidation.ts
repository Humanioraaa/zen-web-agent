export function useTransactionValidation() {
  function validateTransaction(params: {
    amount: number
    walletId: string
    walletToId: string
    categoryId: string
    isTransfer: boolean
  }): string | null {
    if (params.amount <= 0) return 'Nominal harus lebih dari 0'
    if (!params.walletId) return params.isTransfer ? 'Pilih wallet asal' : 'Pilih wallet'
    if (params.isTransfer) {
      if (!params.walletToId) return 'Pilih wallet tujuan'
      if (params.walletToId === params.walletId) return 'Wallet asal dan tujuan tidak boleh sama'
    } else if (!params.categoryId) {
      return 'Pilih kategori'
    }
    return null
  }

  return { validateTransaction }
}
