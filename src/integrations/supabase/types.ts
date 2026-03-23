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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      colors: {
        Row: {
          color_name: string | null
          created_at: string | null
          density: number | null
          gloss: Database["public"]["Enums"]["gloss_type"]
          hex_code: string | null
          id: string
          min_stock_limit: number | null
          price_per_kg: number | null
          price_per_kg_purchase: number | null
          ral_code: string
          stock_kg: number | null
          structure: Database["public"]["Enums"]["structure_type"]
          tenant_id: string | null
        }
        Insert: {
          color_name?: string | null
          created_at?: string | null
          density?: number | null
          gloss?: Database["public"]["Enums"]["gloss_type"]
          hex_code?: string | null
          id?: string
          min_stock_limit?: number | null
          price_per_kg?: number | null
          price_per_kg_purchase?: number | null
          ral_code: string
          stock_kg?: number | null
          structure?: Database["public"]["Enums"]["structure_type"]
          tenant_id?: string | null
        }
        Update: {
          color_name?: string | null
          created_at?: string | null
          density?: number | null
          gloss?: Database["public"]["Enums"]["gloss_type"]
          hex_code?: string | null
          id?: string
          min_stock_limit?: number | null
          price_per_kg?: number | null
          price_per_kg_purchase?: number | null
          ral_code?: string
          stock_kg?: number | null
          structure?: Database["public"]["Enums"]["structure_type"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          bank_account: string | null
          created_at: string | null
          dic: string | null
          ic_dph: string | null
          ico: string | null
          id: string
          is_vat_payer: boolean | null
          logo_url: string | null
          name: string
          paint_coverage_m2_per_kg: number | null
          tenant_id: string | null
          vat_rate: number | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          created_at?: string | null
          dic?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          is_vat_payer?: boolean | null
          logo_url?: string | null
          name: string
          paint_coverage_m2_per_kg?: number | null
          tenant_id?: string | null
          vat_rate?: number | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          created_at?: string | null
          dic?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          is_vat_payer?: boolean | null
          logo_url?: string | null
          name?: string
          paint_coverage_m2_per_kg?: number | null
          tenant_id?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          city: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          dic: string | null
          email: string | null
          house_number: string | null
          ic_dph: string | null
          ico: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          street: string | null
          tenant_id: string | null
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          dic?: string | null
          email?: string | null
          house_number?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tenant_id?: string | null
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          dic?: string | null
          email?: string | null
          house_number?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          street?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          actual_weight_kg: number
          color_id: string | null
          created_at: string | null
          difference_kg: number
          expected_weight_kg: number
          id: string
          reason: string | null
          tenant_id: string | null
          worker_id: string | null
        }
        Insert: {
          actual_weight_kg: number
          color_id?: string | null
          created_at?: string | null
          difference_kg: number
          expected_weight_kg: number
          id?: string
          reason?: string | null
          tenant_id?: string | null
          worker_id?: string | null
        }
        Update: {
          actual_weight_kg?: number
          color_id?: string | null
          created_at?: string | null
          difference_kg?: number
          expected_weight_kg?: number
          id?: string
          reason?: string | null
          tenant_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          area_m2: number | null
          base_coat_id: string | null
          batch_group_id: string | null
          color_id: string | null
          created_at: string | null
          description: string | null
          discount_percent: number | null
          estimated_consumption_kg: number | null
          global_production_number: number | null
          id: string
          is_double_layer: boolean | null
          is_rework: boolean | null
          item_type: Database["public"]["Enums"]["order_item_type"] | null
          order_id: number | null
          price_list_id: string | null
          price_per_m2: number | null
          tenant_id: string | null
          top_coat_id: string | null
          total_price: number | null
          unit: string
          weight_before_temp: number | null
          work_status: string | null
        }
        Insert: {
          area_m2?: number | null
          base_coat_id?: string | null
          batch_group_id?: string | null
          color_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          estimated_consumption_kg?: number | null
          global_production_number?: number | null
          id?: string
          is_double_layer?: boolean | null
          is_rework?: boolean | null
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          order_id?: number | null
          price_list_id?: string | null
          price_per_m2?: number | null
          tenant_id?: string | null
          top_coat_id?: string | null
          total_price?: number | null
          unit?: string
          weight_before_temp?: number | null
          work_status?: string | null
        }
        Update: {
          area_m2?: number | null
          base_coat_id?: string | null
          batch_group_id?: string | null
          color_id?: string | null
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          estimated_consumption_kg?: number | null
          global_production_number?: number | null
          id?: string
          is_double_layer?: boolean | null
          is_rework?: boolean | null
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          order_id?: number | null
          price_list_id?: string | null
          price_per_m2?: number | null
          tenant_id?: string | null
          top_coat_id?: string | null
          total_price?: number | null
          unit?: string
          weight_before_temp?: number | null
          work_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_base_coat_id_fkey"
            columns: ["base_coat_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_base_coat_id_fkey"
            columns: ["base_coat_id"]
            isOneToOne: false
            referencedRelation: "order_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_status_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_top_coat_id_fkey"
            columns: ["top_coat_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_top_coat_id_fkey"
            columns: ["top_coat_id"]
            isOneToOne: false
            referencedRelation: "order_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          company_id: string | null
          created_at: string | null
          customer_id: string | null
          deadline_at: string | null
          due_date: string | null
          id: number
          invoice_url: string | null
          is_paid: boolean | null
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          tenant_id: string | null
          transport_in: Database["public"]["Enums"]["transport_type"] | null
          transport_out: Database["public"]["Enums"]["transport_type"] | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deadline_at?: string | null
          due_date?: string | null
          id?: number
          invoice_url?: string | null
          is_paid?: boolean | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tenant_id?: string | null
          transport_in?: Database["public"]["Enums"]["transport_type"] | null
          transport_out?: Database["public"]["Enums"]["transport_type"] | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          deadline_at?: string | null
          due_date?: string | null
          id?: number
          invoice_url?: string | null
          is_paid?: boolean | null
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          tenant_id?: string | null
          transport_in?: Database["public"]["Enums"]["transport_type"] | null
          transport_out?: Database["public"]["Enums"]["transport_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list: {
        Row: {
          created_at: string | null
          id: string
          item_type: Database["public"]["Enums"]["item_type"]
          price_per_m2: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["item_type"]
          price_per_m2?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          price_per_m2?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_list_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      production_logs: {
        Row: {
          consumed_kg: number | null
          created_at: string | null
          id: string
          order_item_id: string | null
          tenant_id: string | null
          weight_after: number | null
          weight_before: number | null
          worker_id: string | null
        }
        Insert: {
          consumed_kg?: number | null
          created_at?: string | null
          id?: string
          order_item_id?: string | null
          tenant_id?: string | null
          weight_after?: number | null
          weight_before?: number | null
          worker_id?: string | null
        }
        Update: {
          consumed_kg?: number | null
          created_at?: string | null
          id?: string
          order_item_id?: string | null
          tenant_id?: string | null
          weight_after?: number | null
          weight_before?: number | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_logs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          pin_code: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          pin_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          pin_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          created_at: string
          dic: string | null
          ic_dph: string | null
          ico: string | null
          id: string
          name: string
          plan: string
          trial_ends_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          dic?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          name: string
          plan?: string
          trial_ends_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          dic?: string | null
          ic_dph?: string | null
          ico?: string | null
          id?: string
          name?: string
          plan?: string
          trial_ends_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_items_public: {
        Row: {
          description: string | null
          id: string | null
          item_type: Database["public"]["Enums"]["order_item_type"] | null
          order_id: number | null
          work_status: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          order_id?: number | null
          work_status?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          item_type?: Database["public"]["Enums"]["order_item_type"] | null
          order_id?: number | null
          work_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_status_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_public: {
        Row: {
          company_name: string | null
          created_at: string | null
          customer_company: string | null
          customer_name: string | null
          deadline_at: string | null
          id: number | null
          status: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_tenant_for_user: {
        Args: {
          p_address?: string
          p_dic?: string
          p_ic_dph?: string
          p_ico?: string
          p_name: string
        }
        Returns: string
      }
      get_tenant_id: { Args: never; Returns: string }
      get_tenant_status: {
        Args: never
        Returns: {
          days_left: number
          is_expired: boolean
          is_trial: boolean
          plan: string
          trial_ends_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nextval_production_seq: { Args: never; Returns: number }
      update_order_item_work_fields: {
        Args: {
          _batch_group_id?: string
          _item_id: string
          _weight_before_temp?: number
          _work_status?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "worker"
      gloss_type:
        | "leskle"
        | "matne"
        | "polomatne"
        | "satenovane"
        | "hlboko_matne"
        | "metalicke"
        | "fluorescentne"
        | "glitrove"
        | "perletove"
      item_type: "ram" | "vypln" | "lamely" | "sito"
      order_item_type:
        | "standard"
        | "stlp"
        | "disky"
        | "zaklad"
        | "lamely_sito"
        | "ine"
        | "doplnkova_sluzba"
      order_status: "prijate" | "vo_vyrobe" | "ukoncene" | "odovzdane"
      payment_method:
        | "hotovost"
        | "karta"
        | "prevod"
        | "postova_poukazka"
        | "interne"
      structure_type: "hladka" | "jemna" | "hruba" | "antik" | "kladivkova"
      transport_type: "zakaznik" | "zvoz"
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
      app_role: ["admin", "worker"],
      gloss_type: [
        "leskle",
        "matne",
        "polomatne",
        "satenovane",
        "hlboko_matne",
        "metalicke",
        "fluorescentne",
        "glitrove",
        "perletove",
      ],
      item_type: ["ram", "vypln", "lamely", "sito"],
      order_item_type: [
        "standard",
        "stlp",
        "disky",
        "zaklad",
        "lamely_sito",
        "ine",
        "doplnkova_sluzba",
      ],
      order_status: ["prijate", "vo_vyrobe", "ukoncene", "odovzdane"],
      payment_method: [
        "hotovost",
        "karta",
        "prevod",
        "postova_poukazka",
        "interne",
      ],
      structure_type: ["hladka", "jemna", "hruba", "antik", "kladivkova"],
      transport_type: ["zakaznik", "zvoz"],
    },
  },
} as const
