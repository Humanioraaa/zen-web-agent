export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          action: Database['public']['Enums']['audit_action']
          before: Json | null
          after: Json | null
          performed_by: string
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          action: Database['public']['Enums']['audit_action']
          before?: Json | null
          after?: Json | null
          performed_by: string
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          action?: Database['public']['Enums']['audit_action']
          before?: Json | null
          after?: Json | null
          performed_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_log_performed_by_fkey'
            columns: ['performed_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      bot_sessions: {
        Row: {
          telegram_user_id: string
          state: string
          context: Json | null
          updated_at: string
        }
        Insert: {
          telegram_user_id: string
          state?: string
          context?: Json | null
          updated_at?: string
        }
        Update: {
          telegram_user_id?: string
          state?: string
          context?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          type: Database['public']['Enums']['category_type']
          is_default: boolean
        }
        Insert: {
          id?: string
          name: string
          type: Database['public']['Enums']['category_type']
          is_default?: boolean
        }
        Update: {
          id?: string
          name?: string
          type?: Database['public']['Enums']['category_type']
          is_default?: boolean
        }
        Relationships: []
      }
      item_category_memory: {
        Row: {
          id: string
          keyword: string
          category_id: string
          wallet_id: string | null
          confirmed_count: number
        }
        Insert: {
          id?: string
          keyword: string
          category_id: string
          wallet_id?: string | null
          confirmed_count?: number
        }
        Update: {
          id?: string
          keyword?: string
          category_id?: string
          wallet_id?: string | null
          confirmed_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'item_category_memory_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'item_category_memory_wallet_id_fkey'
            columns: ['wallet_id']
            isOneToOne: false
            referencedRelation: 'wallets'
            referencedColumns: ['id']
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          type: Database['public']['Enums']['transaction_type']
          amount: number
          wallet_id: string
          wallet_to_id: string | null
          category_id: string | null
          note: string | null
          date: string
          created_by: string
          source: Database['public']['Enums']['transaction_source']
          created_at: string
        }
        Insert: {
          id?: string
          type: Database['public']['Enums']['transaction_type']
          amount: number
          wallet_id: string
          wallet_to_id?: string | null
          category_id?: string | null
          note?: string | null
          date?: string
          created_by: string
          source?: Database['public']['Enums']['transaction_source']
          created_at?: string
        }
        Update: {
          id?: string
          type?: Database['public']['Enums']['transaction_type']
          amount?: number
          wallet_id?: string
          wallet_to_id?: string | null
          category_id?: string | null
          note?: string | null
          date?: string
          created_by?: string
          source?: Database['public']['Enums']['transaction_source']
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_wallet_id_fkey'
            columns: ['wallet_id']
            isOneToOne: false
            referencedRelation: 'wallets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transactions_wallet_to_id_fkey'
            columns: ['wallet_to_id']
            isOneToOne: false
            referencedRelation: 'wallets'
            referencedColumns: ['id']
          },
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          telegram_user_id: string | null
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          telegram_user_id?: string | null
          onboarding_completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          telegram_user_id?: string | null
          onboarding_completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          id: string
          name: string
          balance: number
          is_active: boolean
        }
        Insert: {
          id?: string
          name: string
          balance?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          name?: string
          balance?: number
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      audit_action: 'create' | 'update' | 'delete'
      category_type: 'income' | 'expense'
      transaction_source: 'web' | 'telegram'
      transaction_type: 'income' | 'expense' | 'transfer'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T]
