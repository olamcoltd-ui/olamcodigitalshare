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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_wallet: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          subscription_revenue: number | null
          total_revenue: number | null
          updated_at: string
          withdrawal_fees: number | null
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          subscription_revenue?: number | null
          total_revenue?: number | null
          updated_at?: string
          withdrawal_fees?: number | null
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          subscription_revenue?: number | null
          total_revenue?: number | null
          updated_at?: string
          withdrawal_fees?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          author: string | null
          brand: string | null
          category: string
          created_at: string
          description: string
          file_size_mb: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          price: number
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          brand?: string | null
          category: string
          created_at?: string
          description: string
          file_size_mb?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          price: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          description?: string
          file_size_mb?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          price?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean | null
          phone: string | null
          referral_code: string
          referred_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          phone?: string | null
          referral_code: string
          referred_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          phone?: string | null
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number | null
          commission_type: string
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          sale_id: string | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          commission_amount: number
          commission_rate?: number | null
          commission_type: string
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          sale_id?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          commission_amount?: number
          commission_rate?: number | null
          commission_type?: string
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          sale_id?: string | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_tracking: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount: number
          buyer_email: string
          buyer_name: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          id: string
          payment_status: string | null
          paystack_reference: string | null
          product_id: string
          referral_code: string | null
          seller_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_email: string
          buyer_name?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          payment_status?: string | null
          paystack_reference?: string | null
          product_id: string
          referral_code?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_email?: string
          buyer_name?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          payment_status?: string | null
          paystack_reference?: string | null
          product_id?: string
          referral_code?: string | null
          seller_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          commission_rate: number
          created_at: string
          duration_months: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          commission_rate: number
          created_at?: string
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          duration_months?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          reference: string | null
          status: string | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          starts_at?: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string
          id: string
          total_earned: number | null
          total_withdrawn: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          id?: string
          total_earned?: number | null
          total_withdrawn?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          account_name: string
          account_number: string
          amount: number
          bank_code: string | null
          bank_name: string
          created_at: string
          failure_reason: string | null
          id: string
          processed_at: string | null
          reference: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          amount: number
          bank_code?: string | null
          bank_name: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          processed_at?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          amount?: number
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          processed_at?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
