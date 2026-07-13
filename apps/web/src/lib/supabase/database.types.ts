export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          address: string | null
          community_id: string | null
          created_at: string
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          role: Database["public"]["Enums"]["account_role"]
        }
        Insert: {
          address?: string | null
          community_id?: string | null
          created_at?: string
          full_name: string
          id: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          role: Database["public"]["Enums"]["account_role"]
        }
        Update: {
          address?: string | null
          community_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          role?: Database["public"]["Enums"]["account_role"]
        }
        Relationships: [
          {
            foreignKeyName: "accounts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      distributors: {
        Row: {
          account_id: string
          commission_rate: number
          company_name: string
          created_at: string
          type: Database["public"]["Enums"]["distributor_type"]
        }
        Insert: {
          account_id: string
          commission_rate?: number
          company_name: string
          created_at?: string
          type?: Database["public"]["Enums"]["distributor_type"]
        }
        Update: {
          account_id?: string
          commission_rate?: number
          company_name?: string
          created_at?: string
          type?: Database["public"]["Enums"]["distributor_type"]
        }
        Relationships: [
          {
            foreignKeyName: "distributors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          account_id: string
          company_name: string
          contract_signed_at: string | null
          created_at: string
          fee_rate: number
          origin_address: string | null
          origin_latitude: number | null
          origin_longitude: number | null
        }
        Insert: {
          account_id: string
          company_name: string
          contract_signed_at?: string | null
          created_at?: string
          fee_rate?: number
          origin_address?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
        }
        Update: {
          account_id?: string
          company_name?: string
          contract_signed_at?: string | null
          created_at?: string
          fee_rate?: number
          origin_address?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          discount_pct: number
          fee_rate: number
          id: string
          line_fee: number
          line_subtotal: number
          order_id: string
          qty: number
          unit_net_price: number
          variant_id: string
        }
        Insert: {
          discount_pct?: number
          fee_rate?: number
          id?: string
          line_fee?: number
          line_subtotal?: number
          order_id: string
          qty: number
          unit_net_price: number
          variant_id: string
        }
        Update: {
          discount_pct?: number
          fee_rate?: number
          id?: string
          line_fee?: number
          line_subtotal?: number
          order_id?: string
          qty?: number
          unit_net_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_prices"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          courier: string
          created_at: string
          fee: number
          id: string
          manufacturer_id: string
          order_id: string
          return_shipping_order_id: string | null
          return_status: string | null
          return_tracking_number: string | null
          service: string
          shipping_order_id: string | null
          shipping_order_ref: string | null
          status: string | null
          tracking_number: string | null
        }
        Insert: {
          courier: string
          created_at?: string
          fee?: number
          id?: string
          manufacturer_id: string
          order_id: string
          return_shipping_order_id?: string | null
          return_status?: string | null
          return_tracking_number?: string | null
          service: string
          shipping_order_id?: string | null
          shipping_order_ref?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Update: {
          courier?: string
          created_at?: string
          fee?: number
          id?: string
          manufacturer_id?: string
          order_id?: string
          return_shipping_order_id?: string | null
          return_status?: string | null
          return_tracking_number?: string | null
          service?: string
          shipping_order_id?: string | null
          shipping_order_ref?: string | null
          status?: string | null
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          fee_amount: number
          id: string
          shipping_courier: string | null
          shipping_fee: number
          shipping_order_ref: string | null
          shipping_service: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_number: string | null
          warung_id: string
        }
        Insert: {
          created_at?: string
          fee_amount?: number
          id?: string
          shipping_courier?: string | null
          shipping_fee?: number
          shipping_order_ref?: string | null
          shipping_service?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          warung_id: string
        }
        Update: {
          created_at?: string
          fee_amount?: number
          id?: string
          shipping_courier?: string | null
          shipping_fee?: number
          shipping_order_ref?: string | null
          shipping_service?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_number?: string | null
          warung_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_warung_id_fkey"
            columns: ["warung_id"]
            isOneToOne: false
            referencedRelation: "warungs"
            referencedColumns: ["account_id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["payment_status"] | null
          id: string
          note: string | null
          payment_id: string
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: string
          note?: string | null
          payment_id: string
          to_status: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["payment_status"] | null
          id?: string
          note?: string | null
          payment_id?: string
          to_status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          confirmation_note: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payment_reference: string | null
          proof_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          confirmation_note?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id: string
          payment_reference?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmation_note?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          payment_reference?: string | null
          proof_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          guaranteed_stock: number
          id: string
          is_active: boolean
          net_price: number
          product_id: string
          variant_name: string
          weight: number
        }
        Insert: {
          created_at?: string
          guaranteed_stock?: number
          id?: string
          is_active?: boolean
          net_price: number
          product_id: string
          variant_name: string
          weight?: number
        }
        Update: {
          created_at?: string
          guaranteed_stock?: number
          id?: string
          is_active?: boolean
          net_price?: number
          product_id?: string
          variant_name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          manufacturer_id: string
          name: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer_id: string
          name: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manufacturer_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["account_id"]
          },
        ]
      }
      quantity_discounts: {
        Row: {
          created_at: string
          discount_pct: number
          id: string
          min_qty: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          discount_pct: number
          id?: string
          min_qty: number
          variant_id: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          id?: string
          min_qty?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quantity_discounts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["variant_id"]
          },
          {
            foreignKeyName: "quantity_discounts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quantity_discounts_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variant_prices"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string
          id: string
          payee_account_id: string | null
          payee_type: Database["public"]["Enums"]["settlement_payee"]
          payment_id: string | null
          shipment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payee_account_id?: string | null
          payee_type: Database["public"]["Enums"]["settlement_payee"]
          payment_id?: string | null
          shipment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payee_account_id?: string | null
          payee_type?: Database["public"]["Enums"]["settlement_payee"]
          payment_id?: string | null
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_payee_account_id_fkey"
            columns: ["payee_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          commission: number
          created_at: string
          distributor_id: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["shipment_status"]
          updated_at: string
        }
        Insert: {
          commission?: number
          created_at?: string
          distributor_id: string
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Update: {
          commission?: number
          created_at?: string
          distributor_id?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "distributors"
            referencedColumns: ["account_id"]
          },
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      warungs: {
        Row: {
          account_id: string
          address: string | null
          created_at: string
          shop_name: string
        }
        Insert: {
          account_id: string
          address?: string | null
          created_at?: string
          shop_name: string
        }
        Update: {
          account_id?: string
          address?: string | null
          created_at?: string
          shop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warungs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalog: {
        Row: {
          brand: string | null
          category: string | null
          manufacturer_id: string | null
          net_price: number | null
          product_id: string | null
          product_name: string | null
          sell_price: number | null
          variant_id: string | null
          variant_name: string | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["account_id"]
          },
        ]
      }
      sales_lines: {
        Row: {
          brand: string | null
          created_at: string | null
          line_fee: number | null
          line_subtotal: number | null
          manufacturer_id: string | null
          order_id: string | null
          order_item_id: string | null
          product_name: string | null
          qty: number | null
          variant_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["account_id"]
          },
        ]
      }
      variant_prices: {
        Row: {
          fee_rate: number | null
          manufacturer_id: string | null
          net_price: number | null
          product_id: string | null
          sell_price: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "catalog"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["account_id"]
          },
        ]
      }
    }
    Functions: {
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["account_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      mfr_in_order: { Args: { p_order_id: string }; Returns: boolean }
      owns_order: { Args: { p_order_id: string }; Returns: boolean }
      set_my_location: {
        Args: { p_address: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
    }
    Enums: {
      account_role: "admin" | "manufacturer" | "warung" | "distributor"
      distributor_type: "internal" | "third_party"
      order_status:
        | "cart"
        | "placed"
        | "paid"
        | "shipped"
        | "delivered"
        | "closed"
        | "cancelled"
      payment_method: "manual_transfer" | "midtrans_snap"
      payment_status:
        | "pending"
        | "confirmed"
        | "settled"
        | "failed"
        | "refunded"
      settlement_payee: "manufacturer" | "halinest" | "distributor" | "shipping"
      shipment_status:
        | "planned"
        | "loaded"
        | "in_transit"
        | "delivered"
        | "reconciled"
        | "cancelled"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: ["admin", "manufacturer", "warung", "distributor"],
      distributor_type: ["internal", "third_party"],
      order_status: [
        "cart",
        "placed",
        "paid",
        "shipped",
        "delivered",
        "closed",
        "cancelled",
      ],
      payment_method: ["manual_transfer", "midtrans_snap"],
      payment_status: ["pending", "confirmed", "settled", "failed", "refunded"],
      settlement_payee: ["manufacturer", "halinest", "distributor", "shipping"],
      shipment_status: [
        "planned",
        "loaded",
        "in_transit",
        "delivered",
        "reconciled",
        "cancelled",
      ],
    },
  },
} as const

