export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      artisans: {
        Row: {
          id: string
          user_id: string | null
          slug: string
          shop_name: string
          headline: string | null
          bio: string | null
          city: string | null
          state: string | null
          avatar_url: string | null
          cover_url: string | null
          whatsapp: string | null
          instagram: string | null
          verified: boolean
          status: string
          pagarme_recipient_id: string | null
          commission_bps: number | null
          created_at: string
          updated_at: string
          claim_code: string | null
          claimed_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          slug: string
          shop_name: string
          headline?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          whatsapp?: string | null
          instagram?: string | null
          verified?: boolean
          status?: string
          pagarme_recipient_id?: string | null
          commission_bps?: number | null
          created_at?: string
          updated_at?: string
          claim_code?: string | null
          claimed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          slug?: string
          shop_name?: string
          headline?: string | null
          bio?: string | null
          city?: string | null
          state?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          whatsapp?: string | null
          instagram?: string | null
          verified?: boolean
          status?: string
          pagarme_recipient_id?: string | null
          commission_bps?: number | null
          created_at?: string
          updated_at?: string
          claim_code?: string | null
          claimed_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          slug: string
          name: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          artisan_id: string
          buyer_user_id: string
          product_id: string | null
          last_message_at: string
          created_at: string
        }
        Insert: {
          id?: string
          artisan_id: string
          buyer_user_id: string
          product_id?: string | null
          last_message_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          artisan_id?: string
          buyer_user_id?: string
          product_id?: string | null
          last_message_at?: string
          created_at?: string
        }
        Relationships: []
      }
      experiences: {
        Row: {
          id: string
          artisan_id: string
          slug: string
          title: string
          description: string | null
          kind: Database["public"]["Enums"]["experience_kind"]
          price_cents: number
          duration_minutes: number | null
          starts_at: string | null
          capacity: number | null
          seats_taken: number
          location: string | null
          cover_path: string | null
          cover_tint: string | null
          status: Database["public"]["Enums"]["listing_status"]
          featured: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artisan_id: string
          slug: string
          title: string
          description?: string | null
          kind: Database["public"]["Enums"]["experience_kind"]
          price_cents: number
          duration_minutes?: number | null
          starts_at?: string | null
          capacity?: number | null
          seats_taken?: number
          location?: string | null
          cover_path?: string | null
          cover_tint?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artisan_id?: string
          slug?: string
          title?: string
          description?: string | null
          kind?: Database["public"]["Enums"]["experience_kind"]
          price_cents?: number
          duration_minutes?: number | null
          starts_at?: string | null
          capacity?: number | null
          seats_taken?: number
          location?: string | null
          cover_path?: string | null
          cover_tint?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          featured?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          body: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          body?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          kind: Database["public"]["Enums"]["order_item_kind"]
          product_id: string | null
          experience_id: string | null
          artisan_id: string
          title: string
          image_path: string | null
          unit_price_cents: number
          quantity: number
          total_cents: number
          commission_bps: number
          platform_fee_cents: number
          artisan_amount_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          kind: Database["public"]["Enums"]["order_item_kind"]
          product_id?: string | null
          experience_id?: string | null
          artisan_id: string
          title: string
          image_path?: string | null
          unit_price_cents: number
          quantity?: number
          total_cents: number
          commission_bps: number
          platform_fee_cents: number
          artisan_amount_cents: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          kind?: Database["public"]["Enums"]["order_item_kind"]
          product_id?: string | null
          experience_id?: string | null
          artisan_id?: string
          title?: string
          image_path?: string | null
          unit_price_cents?: number
          quantity?: number
          total_cents?: number
          commission_bps?: number
          platform_fee_cents?: number
          artisan_amount_cents?: number
          created_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          number: number
          buyer_user_id: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_document: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          shipping_cents: number
          discount_cents: number
          total_cents: number
          platform_fee_cents: number
          shipping_zipcode: string | null
          shipping_street: string | null
          shipping_number: string | null
          shipping_complement: string | null
          shipping_district: string | null
          shipping_city: string | null
          shipping_state: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          pagarme_order_id: string | null
          pagarme_charge_id: string | null
          paid_at: string | null
          canceled_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          number?: number
          buyer_user_id: string
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          buyer_document?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          shipping_cents?: number
          discount_cents?: number
          total_cents?: number
          platform_fee_cents?: number
          shipping_zipcode?: string | null
          shipping_street?: string | null
          shipping_number?: string | null
          shipping_complement?: string | null
          shipping_district?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pagarme_order_id?: string | null
          pagarme_charge_id?: string | null
          paid_at?: string | null
          canceled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          number?: number
          buyer_user_id?: string
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          buyer_document?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          shipping_cents?: number
          discount_cents?: number
          total_cents?: number
          platform_fee_cents?: number
          shipping_zipcode?: string | null
          shipping_street?: string | null
          shipping_number?: string | null
          shipping_complement?: string | null
          shipping_district?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          pagarme_order_id?: string | null
          pagarme_charge_id?: string | null
          paid_at?: string | null
          canceled_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: boolean
          default_commission_bps: number
          support_email: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          default_commission_bps?: number
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          default_commission_bps?: number
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          storage_path: string
          alt: string | null
          tint: string | null
          width: number | null
          height: number | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          storage_path: string
          alt?: string | null
          tint?: string | null
          width?: number | null
          height?: number | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          storage_path?: string
          alt?: string | null
          tint?: string | null
          width?: number | null
          height?: number | null
          position?: number
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          artisan_id: string
          category_id: string | null
          slug: string
          title: string
          description: string | null
          price_cents: number
          compare_at_price_cents: number | null
          stock_mode: Database["public"]["Enums"]["stock_mode"]
          stock_quantity: number
          status: Database["public"]["Enums"]["listing_status"]
          featured: boolean
          weight_grams: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artisan_id: string
          category_id?: string | null
          slug: string
          title: string
          description?: string | null
          price_cents: number
          compare_at_price_cents?: number | null
          stock_mode?: Database["public"]["Enums"]["stock_mode"]
          stock_quantity?: number
          status?: Database["public"]["Enums"]["listing_status"]
          featured?: boolean
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artisan_id?: string
          category_id?: string | null
          slug?: string
          title?: string
          description?: string | null
          price_cents?: number
          compare_at_price_cents?: number | null
          stock_mode?: Database["public"]["Enums"]["stock_mode"]
          stock_quantity?: number
          status?: Database["public"]["Enums"]["listing_status"]
          featured?: boolean
          weight_grams?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          shop_name: string | null
          city: string | null
          state: string | null
          bio: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          shop_name?: string | null
          city?: string | null
          state?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          shop_name?: string | null
          city?: string | null
          state?: string | null
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          order_item_id: string
          artisan_id: string
          product_id: string | null
          experience_id: string | null
          author_id: string
          rating: number
          comment: string | null
          artisan_reply: string | null
          replied_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_item_id: string
          artisan_id: string
          product_id?: string | null
          experience_id?: string | null
          author_id: string
          rating: number
          comment?: string | null
          artisan_reply?: string | null
          replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_item_id?: string
          artisan_id?: string
          product_id?: string | null
          experience_id?: string | null
          author_id?: string
          rating?: number
          comment?: string | null
          artisan_reply?: string | null
          replied_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews_legacy: {
        Row: {
          id: string
          artisan_user_id: string
          reviewer_name: string
          reviewer_city: string | null
          rating: number
          comment: string | null
          product_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artisan_user_id: string
          reviewer_name: string
          reviewer_city?: string | null
          rating: number
          comment?: string | null
          product_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artisan_user_id?: string
          reviewer_name?: string
          reviewer_city?: string | null
          rating?: number
          comment?: string | null
          product_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
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
        Relationships: []
      }
      order_items_todos: {
        Row: {
          id: string | null
          order_id: string | null
          kind: Database["public"]["Enums"]["order_item_kind"] | null
          product_id: string | null
          experience_id: string | null
          artisan_id: string | null
          title: string | null
          image_path: string | null
          unit_price_cents: number | null
          quantity: number | null
          total_cents: number | null
          commission_bps: number | null
          platform_fee_cents: number | null
          artisan_amount_cents: number | null
          created_at: string | null
        }
        Relationships: []
      }
      reviews_todas: {
        Row: {
          id: string | null
          order_item_id: string | null
          artisan_id: string | null
          product_id: string | null
          experience_id: string | null
          author_id: string | null
          rating: number | null
          comment: string | null
          artisan_reply: string | null
          replied_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      comissao_bps: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      criar_minha_loja: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      criar_pedido: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      has_role: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      is_admin: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      my_artisan_id: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      pode_avaliar: {
        Args: Record<string, unknown>
        Returns: unknown
      }
      reivindicar_loja: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      app_role: "buyer" | "artisan" | "admin"
      experience_kind: "live" | "recorded" | "in_person" | "mentorship"
      listing_status: "draft" | "active" | "sold_out" | "archived"
      order_item_kind: "product" | "experience"
      order_status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "canceled" | "refunded"
      payment_method: "pix" | "credit_card" | "boleto"
      stock_mode: "unique" | "quantity"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
