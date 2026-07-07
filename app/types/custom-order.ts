export type CustomOrderStatus = 'quote' | 'confirmed' | 'in_progress' | 'done' | 'cancelled'

// Derived per-order P&L (computed server-side from tagged transactions).
export interface CustomOrderTotals {
  paid: number // Σ tagged income
  cost: number // Σ tagged expense
  margin: number // paid − cost
  margin_pct: number | null // null when paid = 0
  outstanding: number // quoted_price − paid
}

export interface CustomOrder extends CustomOrderTotals {
  id: string
  customer_name: string
  item_name: string // free text (random menu — not a menu_items FK)
  qty: number
  unit_price: number | null
  quoted_price: number
  order_date: string // YYYY-MM-DD
  due_date: string | null
  status: CustomOrderStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// A transaction tagged to this order (shown on the detail page).
export interface CustomOrderTransaction {
  id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  note: string | null
  date: string
  category_id: string | null
  wallet_id: string
}

export interface CustomOrderDetail extends CustomOrder {
  transactions: CustomOrderTransaction[]
}

export interface CustomOrderCreateInput {
  customer_name: string
  item_name: string
  qty: number
  unit_price?: number | null
  quoted_price: number
  order_date?: string // defaults to today (DB) when omitted
  due_date?: string | null
  status?: CustomOrderStatus // defaults to 'quote'
  notes?: string | null
}

export interface CustomOrderUpdateInput {
  customer_name?: string
  item_name?: string
  qty?: number
  unit_price?: number | null
  quoted_price?: number
  order_date?: string
  due_date?: string | null
  status?: CustomOrderStatus
  notes?: string | null
}
