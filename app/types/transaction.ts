export interface TransactionListFilters {
  type?: string
  wallet_id?: string
  category_id?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

export interface TransactionCreateInput {
  type: 'income' | 'expense' | 'transfer'
  amount: number
  wallet_id: string
  wallet_to_id?: string
  category_id?: string
  note?: string
  date?: string
  source?: 'web' | 'telegram'
}

export interface TransactionUpdateInput {
  amount?: number
  wallet_id?: string
  wallet_to_id?: string | null
  category_id?: string | null
  note?: string | null
  date?: string
}
