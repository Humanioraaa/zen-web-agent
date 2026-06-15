export type CategoryType = 'income' | 'expense'

// Curated DTO for the categories endpoint (mirrors server categoryRepository select).
export interface Category {
  id: string
  name: string
  type: CategoryType
  is_default: boolean
}
