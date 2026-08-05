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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artisans: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          commission_bps: number | null
          cover_url: string | null
          created_at: string
          headline: string | null
          id: string
          instagram: string | null
          pagarme_recipient_id: string | null
          shop_name: string
          slug: string
          state: string | null
          status: string
          updated_at: string
          user_id: string
          verified: boolean
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          commission_bps?: number | null
          cover_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          instagram?: string | null
          pagarme_recipient_id?: string | null
          shop_name: string
          slug: string
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verified?: boolean
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          commission_bps?: number | null
          cover_url?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          instagram?: string | null
          pagarme_recipient_id?: string | null
          shop_name?: string
          slug?: string
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          whatsapp?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          artisan_id: string
          buyer_user_id: string
          created_at: string
          id: string
          last_message_at: string
          product_id: string | null
        }
        Insert: {
          artisan_id: string
          buyer_user_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          product_id?: string | null
        }
        Update: {
          artisan_id?: string
          buyer_user_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          artisan_id: string
          capacity: number | null
          cover_path: string | null
          cover_tint: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          featured: boolean
          id: string
          kind: Database["public"]["Enums"]["experience_kind"]
          location: string | null
          price_cents: number
          seats_taken: number
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
        }
        Insert: {
          artisan_id: string
          capacity?: number | null
          cover_path?: string | null
          cover_tint?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean
          id?: string
          kind: Database["public"]["Enums"]["experience_kind"]
          location?: string | null
          price_cents: number
          seats_taken?: number
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          capacity?: number | null
          cover_path?: string | null
          cover_tint?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          featured?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["experience_kind"]
          location?: string | null
          price_cents?: number
          seats_taken?: number
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          artisan_amount_cents: number
          artisan_id: string
          commission_bps: number
          created_at: string
          experience_id: string | null
          id: string
          image_path: string | null
          kind: Database["public"]["Enums"]["order_item_kind"]
          order_id: string
          platform_fee_cents: number
          product_id: string | null
          quantity: number
          title: string
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          artisan_amount_cents: number
          artisan_id: string
          commission_bps: number
          created_at?: string
          experience_id?: string | null
          id?: string
          image_path?: string | null
          kind: Database["public"]["Enums"]["order_item_kind"]
          order_id: string
          platform_fee_cents: number
          product_id?: string | null
          quantity?: number
          title: string
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          artisan_amount_cents?: number
          artisan_id?: string
          commission_bps?: number
          created_at?: string
          experience_id?: string | null
          id?: string
          image_path?: string | null
          kind?: Database["public"]["Enums"]["order_item_kind"]
          order_id?: string
          platform_fee_cents?: number
          product_id?: string | null
          quantity?: number
          title?: string
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
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
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_document: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_user_id: string
          canceled_at: string | null
          created_at: string
          discount_cents: number
          id: string
          notes: string | null
          number: number
          pagarme_charge_id: string | null
          pagarme_order_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents: number
          shipping_cents: number
          shipping_city: string | null
          shipping_complement: string | null
          shipping_district: string | null
          shipping_number: string | null
          shipping_state: string | null
          shipping_street: string | null
          shipping_zipcode: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          buyer_document?: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          buyer_user_id: string
          canceled_at?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          notes?: string | null
          number?: never
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents?: number
          shipping_cents?: number
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_district?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zipcode?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          buyer_document?: string | null
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          buyer_user_id?: string
          canceled_at?: string | null
          created_at?: string
          discount_cents?: number
          id?: string
          notes?: string | null
          number?: never
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents?: number
          shipping_cents?: number
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_district?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zipcode?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          default_commission_bps: number
          id: boolean
          support_email: string | null
          updated_at: string
        }
        Insert: {
          default_commission_bps?: number
          id?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          default_commission_bps?: number
          id?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          height: number | null
          id: string
          position: number
          product_id: string
          storage_path: string
          tint: string | null
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id: string
          storage_path: string
          tint?: string | null
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          product_id?: string
          storage_path?: string
          tint?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artisan_id: string
          category_id: string | null
          compare_at_price_cents: number | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          price_cents: number
          slug: string
          status: Database["public"]["Enums"]["listing_status"]
          stock_mode: Database["public"]["Enums"]["stock_mode"]
          stock_quantity: number
          title: string
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          artisan_id: string
          category_id?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          price_cents: number
          slug: string
          status?: Database["public"]["Enums"]["listing_status"]
          stock_mode?: Database["public"]["Enums"]["stock_mode"]
          stock_quantity?: number
          title: string
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          artisan_id?: string
          category_id?: string | null
          compare_at_price_cents?: number | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          price_cents?: number
          slug?: string
          status?: Database["public"]["Enums"]["listing_status"]
          stock_mode?: Database["public"]["Enums"]["stock_mode"]
          stock_quantity?: number
          title?: string
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          shop_name: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          shop_name?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          shop_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artisan_id: string
          artisan_reply: string | null
          author_id: string
          comment: string | null
          created_at: string
          experience_id: string | null
          id: string
          order_item_id: string
          product_id: string | null
          rating: number
          replied_at: string | null
          updated_at: string
        }
        Insert: {
          artisan_id: string
          artisan_reply?: string | null
          author_id: string
          comment?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          order_item_id: string
          product_id?: string | null
          rating: number
          replied_at?: string | null
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          artisan_reply?: string | null
          author_id?: string
          comment?: string | null
          created_at?: string
          experience_id?: string | null
          id?: string
          order_item_id?: string
          product_id?: string | null
          rating?: number
          replied_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews_legacy: {
        Row: {
          artisan_user_id: string
          comment: string | null
          created_at: string
          id: string
          product_name: string | null
          rating: number
          reviewer_city: string | null
          reviewer_name: string
        }
        Insert: {
          artisan_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          rating: number
          reviewer_city?: string | null
          reviewer_name: string
        }
        Update: {
          artisan_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          rating?: number
          reviewer_city?: string | null
          reviewer_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      artisan_ratings: {
        Row: {
          artisan_id: string | null
          average_rating: number | null
          review_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "artisans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      caminho_e_da_minha_loja: { Args: { _name: string }; Returns: boolean }
      comissao_bps: { Args: { _artisan_id: string }; Returns: number }
      criar_minha_loja: {
        Args: {
          _bio?: string
          _city?: string
          _shop_name: string
          _slug: string
          _state?: string
        }
        Returns: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          commission_bps: number | null
          cover_url: string | null
          created_at: string
          headline: string | null
          id: string
          instagram: string | null
          pagarme_recipient_id: string | null
          shop_name: string
          slug: string
          state: string | null
          status: string
          updated_at: string
          user_id: string
          verified: boolean
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "artisans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      criar_pedido: {
        Args: {
          _buyer_document?: string
          _buyer_email: string
          _buyer_name: string
          _buyer_phone?: string
          _itens: Json
          _shipping?: Json
          _shipping_cents?: number
        }
        Returns: {
          buyer_document: string | null
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_user_id: string
          canceled_at: string | null
          created_at: string
          discount_cents: number
          id: string
          notes: string | null
          number: number
          pagarme_charge_id: string | null
          pagarme_order_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          platform_fee_cents: number
          shipping_cents: number
          shipping_city: string | null
          shipping_complement: string | null
          shipping_district: string | null
          shipping_number: string | null
          shipping_state: string | null
          shipping_street: string | null
          shipping_zipcode: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_artisan_id: { Args: never; Returns: string }
      owns_artisan: { Args: { _artisan_id: string }; Returns: boolean }
      participa_da_conversa: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      pedido_tem_item_meu: { Args: { _order_id: string }; Returns: boolean }
      pode_avaliar: { Args: { _order_item_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "buyer" | "artisan" | "admin"
      experience_kind: "live" | "recorded" | "in_person" | "mentorship"
      listing_status: "draft" | "active" | "sold_out" | "archived"
      order_item_kind: "product" | "experience"
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "canceled"
        | "refunded"
      payment_method: "pix" | "credit_card" | "boleto"
      stock_mode: "unique" | "quantity"
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
      app_role: ["buyer", "artisan", "admin"],
      experience_kind: ["live", "recorded", "in_person", "mentorship"],
      listing_status: ["draft", "active", "sold_out", "archived"],
      order_item_kind: ["product", "experience"],
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "canceled",
        "refunded",
      ],
      payment_method: ["pix", "credit_card", "boleto"],
      stock_mode: ["unique", "quantity"],
    },
  },
} as const
