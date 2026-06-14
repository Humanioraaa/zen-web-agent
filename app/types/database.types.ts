export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          performed_by: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          performed_by: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_sessions: {
        Row: {
          context: Json | null
          state: string
          telegram_user_id: string
          updated_at: string
        }
        Insert: {
          context?: Json | null
          state?: string
          telegram_user_id: string
          updated_at?: string
        }
        Update: {
          context?: Json | null
          state?: string
          telegram_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          type: Database["public"]["Enums"]["category_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          type?: Database["public"]["Enums"]["category_type"]
        }
        Relationships: []
      }
      ingredient_price_history: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          note: string | null
          package_cost: number
          package_size: number
          pct_change: number | null
          restock_id: string | null
          source: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          note?: string | null
          package_cost: number
          package_size: number
          pct_change?: number | null
          restock_id?: string | null
          source: string
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          note?: string | null
          package_cost?: number
          package_size?: number
          pct_change?: number | null
          restock_id?: string | null
          source?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_price_history_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_price_history_restock_id_fkey"
            columns: ["restock_id"]
            isOneToOne: false
            referencedRelation: "restocks"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredients: {
        Row: {
          base_unit: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          package_cost: number
          package_size: number
          price_alert_threshold_pct: number | null
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          base_unit: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          package_cost: number
          package_size: number
          price_alert_threshold_pct?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          base_unit?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          package_cost?: number
          package_size?: number
          price_alert_threshold_pct?: number | null
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      item_category_memory: {
        Row: {
          category_id: string
          confirmed_count: number
          created_at: string
          id: string
          keyword: string
          wallet_id: string | null
        }
        Insert: {
          category_id: string
          confirmed_count?: number
          created_at?: string
          id?: string
          keyword: string
          wallet_id?: string | null
        }
        Update: {
          category_id?: string
          confirmed_count?: number
          created_at?: string
          id?: string
          keyword?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_category_memory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_category_memory_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          safe_threshold: number
          sort_order: number
          warning_threshold: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          safe_threshold?: number
          sort_order?: number
          warning_threshold?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          safe_threshold?: number
          sort_order?: number
          warning_threshold?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          selling_price: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          selling_price: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          selling_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_items: {
        Row: {
          id: string
          ingredient_id: string
          menu_id: string
          quantity: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          menu_id: string
          quantity: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          menu_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restocks: {
        Row: {
          created_at: string
          created_by: string | null
          expense_transaction_id: string | null
          id: string
          ingredient_id: string
          note: string | null
          package_cost: number
          package_size_at_time: number
          packages: number
          qty_unit: string
          qty_value: number
          total_cost: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_transaction_id?: string | null
          id?: string
          ingredient_id: string
          note?: string | null
          package_cost: number
          package_size_at_time: number
          packages: number
          qty_unit: string
          qty_value: number
          total_cost: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_transaction_id?: string | null
          id?: string
          ingredient_id?: string
          note?: string | null
          package_cost?: number
          package_size_at_time?: number
          packages?: number
          qty_unit?: string
          qty_value?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "restocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restocks_expense_transaction_id_fkey"
            columns: ["expense_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restocks_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          date: string
          id: string
          note: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
          wallet_to_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          date?: string
          id?: string
          note?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
          wallet_to_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          note?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
          wallet_to_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_to_id_fkey"
            columns: ["wallet_to_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          onboarding_completed: boolean
          telegram_user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          onboarding_completed?: boolean
          telegram_user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          onboarding_completed?: boolean
          telegram_user_id?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_restock: {
        Args: {
          p_apply_price: boolean
          p_category_id: string
          p_created_by: string
          p_date: string
          p_ingredient_id: string
          p_note: string
          p_package_cost: number
          p_package_size_at_time: number
          p_packages: number
          p_pct_change: number
          p_qty_unit: string
          p_qty_value: number
          p_source: string
          p_total_cost: number
          p_wallet_id: string
        }
        Returns: Json
      }
      match_ingredients: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          base_unit: string
          id: string
          name: string
          package_cost: number
          package_size: number
          price_alert_threshold_pct: number
          similarity: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      audit_action: "create" | "update" | "delete"
      category_type: "income" | "expense"
      transaction_source: "web" | "telegram"
      transaction_type: "income" | "expense" | "transfer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_action: ["create", "update", "delete"],
      category_type: ["income", "expense"],
      transaction_source: ["web", "telegram"],
      transaction_type: ["income", "expense", "transfer"],
    },
  },
} as const
