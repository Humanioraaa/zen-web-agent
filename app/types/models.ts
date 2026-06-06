export interface Wallet {
  id: string
  name: string
  balance: number
  is_active: boolean
}

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_default: boolean
}

export interface TransactionRecord {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number | string
  wallet_id: string
  wallet_to_id: string | null
  category_id: string | null
  note: string | null
  date: string
  source: 'web' | 'telegram'
  created_at: string
  wallet: { id: string; name: string } | null
  wallet_to: { id: string; name: string } | null
  category: { id: string; name: string; type: string } | null
  creator: { id: string; name: string } | null
}
