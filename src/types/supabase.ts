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
      branches: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_main_branch: boolean | null
          name: string
          organization_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_branch?: boolean | null
          name: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_main_branch?: boolean | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          organization_id: string | null
          phone: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          phone: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          parent_id: string
          parent_type: string
          signature_data_url: string
          signer_name: string
          signer_role: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          parent_id: string
          parent_type: string
          signature_data_url: string
          signer_name: string
          signer_role?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          parent_id?: string
          parent_type?: string
          signature_data_url?: string
          signer_name?: string
          signer_role?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          barcode: string | null
          branch_id: string | null
          brand: string | null
          category: string
          condition: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expiry_date: string | null
          id: string
          images: string[] | null
          last_restock_date: string | null
          location: string | null
          max_stock: number | null
          min_stock: number
          model: string | null
          name: string
          notes: string | null
          organization_id: string | null
          quantity: number
          sale_price: number | null
          service_type: string | null
          sku: string | null
          status: string | null
          subcategory: string | null
          supplier_contact: string | null
          supplier_id: string | null
          supplier_name: string | null
          updated_at: string | null
          warranty_months: number | null
          wholesale_price: number | null
        }
        Insert: {
          barcode?: string | null
          branch_id?: string | null
          brand?: string | null
          category: string
          condition?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          images?: string[] | null
          last_restock_date?: string | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          model?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          sale_price?: number | null
          service_type?: string | null
          sku?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          warranty_months?: number | null
          wholesale_price?: number | null
        }
        Update: {
          barcode?: string | null
          branch_id?: string | null
          brand?: string | null
          category?: string
          condition?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          images?: string[] | null
          last_restock_date?: string | null
          location?: string | null
          max_stock?: number | null
          min_stock?: number
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          quantity?: number
          sale_price?: number | null
          service_type?: string | null
          sku?: string | null
          status?: string | null
          subcategory?: string | null
          supplier_contact?: string | null
          supplier_id?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          warranty_months?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          subscription_plan: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          subscription_plan?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_plan?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repair_orders: {
        Row: {
          advance_payment: number | null
          branch_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string
          completed_at: string | null
          confirmed_diagnosis: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          device_brand: string
          device_description: string | null
          device_model: string | null
          device_serial: string | null
          device_type: string
          estimated_date: string | null
          folio: string
          id: string
          images: string[] | null
          initial_diagnosis: string | null
          labor_cost: number | null
          notes: string[] | null
          organization_id: string | null
          parts_cost: number | null
          payment_status: string | null
          problem_description: string | null
          remaining_payment: number | null
          required_parts: string[] | null
          status: string
          storage_period_months: number | null
          total_cost: number | null
          total_payment: number | null
          updated_at: string | null
          warranty_period_months: number | null
        }
        Insert: {
          advance_payment?: number | null
          branch_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone: string
          completed_at?: string | null
          confirmed_diagnosis?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          device_brand: string
          device_description?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type: string
          estimated_date?: string | null
          folio: string
          id?: string
          images?: string[] | null
          initial_diagnosis?: string | null
          labor_cost?: number | null
          notes?: string[] | null
          organization_id?: string | null
          parts_cost?: number | null
          payment_status?: string | null
          problem_description?: string | null
          remaining_payment?: number | null
          required_parts?: string[] | null
          status?: string
          storage_period_months?: number | null
          total_cost?: number | null
          total_payment?: number | null
          updated_at?: string | null
          warranty_period_months?: number | null
        }
        Update: {
          advance_payment?: number | null
          branch_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string
          completed_at?: string | null
          confirmed_diagnosis?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          device_brand?: string
          device_description?: string | null
          device_model?: string | null
          device_serial?: string | null
          device_type?: string
          estimated_date?: string | null
          folio?: string
          id?: string
          images?: string[] | null
          initial_diagnosis?: string | null
          labor_cost?: number | null
          notes?: string[] | null
          organization_id?: string | null
          parts_cost?: number | null
          payment_status?: string | null
          problem_description?: string | null
          remaining_payment?: number | null
          required_parts?: string[] | null
          status?: string
          storage_period_months?: number | null
          total_cost?: number | null
          total_payment?: number | null
          updated_at?: string | null
          warranty_period_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_status_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          new_status: string
          note: string | null
          previous_status: string | null
          repair_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_status: string
          note?: string | null
          previous_status?: string | null
          repair_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_status?: string
          note?: string | null
          previous_status?: string | null
          repair_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_status_history_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          discount: number | null
          id: string
          product_id: string | null
          quantity: number
          sale_id: string | null
          subtotal: number
          unit_price: number
        }
        Insert: {
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          subtotal: number
          unit_price: number
        }
        Update: {
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          branch_id: string | null
          change_amount: number | null
          client_id: string | null
          client_name: string | null
          created_at: string | null
          created_by: string | null
          discount: number | null
          id: string
          notes: string | null
          organization_id: string | null
          payment_method: string
          sale_number: string
          subtotal: number
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number
          branch_id?: string | null
          change_amount?: number | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_method: string
          sale_number: string
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number
          branch_id?: string | null
          change_amount?: number | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string | null
          created_by?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          payment_method?: string
          sale_number?: string
          subtotal?: number
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_notifications: {
        Row: {
          body: string
          client_id: string | null
          created_at: string | null
          id: string
          last_error: string | null
          payload: Json | null
          repair_id: string | null
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          repair_id?: string | null
          retry_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          payload?: Json | null
          repair_id?: string | null
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_notifications_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          id: string
          notes: string | null
          reason: string
          repair_id: string | null
          resolution: string | null
          status: string | null
          technician: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          reason: string
          repair_id?: string | null
          resolution?: string | null
          status?: string | null
          technician?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          notes?: string | null
          reason?: string
          repair_id?: string | null
          resolution?: string | null
          status?: string | null
          technician?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repair_orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_inventory_stock: {
        Args: { item_id: string; quantity_change: number }
        Returns: undefined
      }
      process_due_notifications: { Args: never; Returns: undefined }
      schedule_notification: {
        Args: {
          p_body: string
          p_client_id: string
          p_payload?: Json
          p_repair_id: string
          p_scheduled_for: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
    }
    Enums: {
      user_role: "super_admin" | "org_admin" | "branch_admin" | "technician"
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
      user_role: ["super_admin", "org_admin", "branch_admin", "technician"],
    },
  },
} as const
