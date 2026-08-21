-- =====================================================================
-- BASELINE DO SCHEMA — retrato do banco em 21/08/2026
--
-- POR QUE ESTE ARQUIVO EXISTE
-- O banco tem 28 tabelas, mas as migrations versionadas cobriam apenas 10.
-- As outras 18 — products, orders, order_items, custom_requests,
-- conversations, messages, pagarme_events, platform_settings, entre
-- outras — foram criadas direto no painel e existiam SOMENTE naquele
-- ambiente. Se o projeto Supabase fosse recriado ou perdido, elas não
-- voltariam, junto com 69 policies de RLS, 34 funções e 14 triggers.
--
-- Tudo aqui usa IF NOT EXISTS / OR REPLACE: é seguro rodar sobre o banco
-- atual, não recria o que já existe e não apaga dado.
--
-- Ordem: extensões → schema private → enums → tabelas → constraints →
--        índices → funções → triggers → RLS → policies → grants
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Lógica de negócio e checagens de acesso ficam fora do schema exposto
-- pela API. Só o service_role e as fachadas em public alcançam.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('buyer', 'artisan', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.distribution_mode AS ENUM ('artesao_especifico', 'recomendados', 'aberta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.experience_kind AS ENUM ('live', 'recorded', 'in_person', 'mentorship');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'sold_out', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.match_response AS ENUM ('pendente', 'visualizada', 'interessado', 'mais_informacoes', 'recusada', 'proposta_enviada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.offering_type AS ENUM ('product', 'custom_order', 'class', 'workshop', 'course', 'studio_visit', 'cultural_experience', 'lecture', 'event', 'corporate', 'stores', 'hotels', 'architects', 'corporate_gifts', 'school', 'undecided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.order_item_kind AS ENUM ('product', 'experience');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('pix', 'credit_card', 'boleto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.request_status AS ENUM ('rascunho', 'enviada', 'em_distribuicao', 'recebendo_propostas', 'em_negociacao', 'proposta_escolhida', 'aguardando_pagamento', 'confirmada', 'em_producao', 'pronta_para_envio', 'enviada_ao_cliente', 'entregue', 'concluida', 'cancelada', 'expirada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.request_type AS ENUM ('personalizar', 'peca_nova', 'quantidade', 'brindes', 'evento', 'decoracao', 'loja', 'hotelaria', 'arquitetura', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.stock_mode AS ENUM ('unique', 'quantity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text,
  shop_name text,
  city text,
  state text,
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.artisans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL,
  shop_name text NOT NULL,
  headline text,
  bio text,
  city text,
  state character(2),
  avatar_url text,
  cover_url text,
  whatsapp text,
  instagram text,
  verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  public_name text,
  logo_url text,
  workshop_image_url text,
  working_image_url text,
  facebook text,
  website text,
  years_of_experience integer,
  production_capacity_monthly integer,
  average_production_days integer,
  minimum_order_days integer,
  team_size integer,
  accepts_custom_orders boolean NOT NULL DEFAULT false,
  accepts_large_orders boolean NOT NULL DEFAULT false,
  ships_nationwide boolean NOT NULL DEFAULT false,
  has_ready_stock boolean NOT NULL DEFAULT false,
  sells_to_people boolean NOT NULL DEFAULT true,
  sells_to_companies boolean NOT NULL DEFAULT false,
  sells_to_stores boolean NOT NULL DEFAULT false,
  sells_to_architects boolean NOT NULL DEFAULT false,
  receives_visitors boolean NOT NULL DEFAULT false,
  onboarding_step text,
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  onboarding_skipped_at timestamptz,
  whatsapp_publico boolean NOT NULL DEFAULT false,
  min_order_value_cents integer,
  delivery_regions text[] NOT NULL DEFAULT '{}'::text[],
  custom_order_notes text,
  teaching_notes text,
  accessibility_notes text,
  visit_by_appointment boolean NOT NULL DEFAULT true,
  company_name text,
  company_document text,
  issues_invoice boolean NOT NULL DEFAULT false,
  corporate_min_quantity integer,
  additional_notes text
);

-- Dados financeiros do artesão: recebedor no gateway, comissão e KYC.
CREATE TABLE IF NOT EXISTS public.artisan_billing (
  artisan_id uuid NOT NULL,
  pagarme_recipient_id text,
  commission_bps integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  recipient_status text,
  kyc_status text,
  kyc_url text,
  kyc_url_expires_at timestamptz,
  can_withdraw boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.materials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL, name text NOT NULL, position integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.styles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL, name text NOT NULL, position integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS public.techniques (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL, name text NOT NULL, position integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.artisan_materials (
  artisan_id uuid NOT NULL, material_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false, outro text
);
CREATE TABLE IF NOT EXISTS public.artisan_styles (
  artisan_id uuid NOT NULL, style_id uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS public.artisan_techniques (
  artisan_id uuid NOT NULL, technique_id uuid NOT NULL,
  is_primary boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.artisan_offerings (
  artisan_id uuid NOT NULL,
  offering_type public.offering_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL, name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artisan_id uuid NOT NULL,
  category_id uuid,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  compare_at_price_cents integer,
  stock_mode public.stock_mode NOT NULL DEFAULT 'unique'::public.stock_mode,
  stock_quantity integer NOT NULL DEFAULT 1,
  status public.listing_status NOT NULL DEFAULT 'draft'::public.listing_status,
  featured boolean NOT NULL DEFAULT false,
  weight_grams integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  storage_path text NOT NULL,
  alt text, tint text, width integer, height integer,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artisan_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  kind public.experience_kind NOT NULL,
  price_cents integer NOT NULL,
  duration_minutes integer,
  starts_at timestamptz,
  capacity integer,
  seats_taken integer NOT NULL DEFAULT 0,
  location text, cover_path text, cover_tint text,
  status public.listing_status NOT NULL DEFAULT 'draft'::public.listing_status,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  number bigint NOT NULL,
  buyer_user_id uuid NOT NULL,
  buyer_email text NOT NULL,
  buyer_name text NOT NULL,
  buyer_phone text,
  buyer_document text,
  status public.order_status NOT NULL DEFAULT 'pending'::public.order_status,
  subtotal_cents integer NOT NULL DEFAULT 0,
  shipping_cents integer NOT NULL DEFAULT 0,
  discount_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  shipping_zipcode text, shipping_street text, shipping_number text,
  shipping_complement text, shipping_district text, shipping_city text,
  shipping_state character(2),
  payment_method public.payment_method,
  pagarme_order_id text,
  pagarme_charge_id text,
  paid_at timestamptz,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  service_fee_cents integer NOT NULL DEFAULT 0,
  installments integer NOT NULL DEFAULT 1,
  pix_qr_code text, pix_expires_at timestamptz,
  boleto_url text, boleto_line text,
  payment_error text
);

-- Comissão congelada por item: se a taxa mudar depois, o histórico não muda.
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  kind public.order_item_kind NOT NULL,
  product_id uuid,
  experience_id uuid,
  artisan_id uuid NOT NULL,
  title text NOT NULL,
  image_path text,
  unit_price_cents integer NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_cents integer NOT NULL,
  commission_bps integer NOT NULL,
  platform_fee_cents integer NOT NULL,
  artisan_amount_cents integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pagarme_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_type text NOT NULL,
  order_id uuid,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean NOT NULL DEFAULT true,
  default_commission_bps integer NOT NULL DEFAULT 1200,
  support_email text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  service_fee_pix_bps integer NOT NULL DEFAULT 99,
  service_fee_card_bps integer NOT NULL DEFAULT 399,
  service_fee_boleto_cents integer NOT NULL DEFAULT 349
);

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artisan_id uuid NOT NULL,
  buyer_user_id uuid NOT NULL,
  product_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  request_id uuid
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  number bigint NOT NULL,
  buyer_user_id uuid NOT NULL,
  request_type public.request_type NOT NULL,
  source_product_id uuid,
  selected_artisan_id uuid,
  title text, description text, intended_use text,
  quantity_min integer, quantity_max integer,
  budget_min_cents integer, budget_max_cents integer,
  desired_date date, desired_period text,
  delivery_postal_code text, delivery_city text, delivery_state character(2),
  customizations jsonb NOT NULL DEFAULT '{}'::jsonb,
  distribution_mode public.distribution_mode NOT NULL DEFAULT 'recomendados'::public.distribution_mode,
  max_proposals integer NOT NULL DEFAULT 3,
  status public.request_status NOT NULL DEFAULT 'rascunho'::public.request_status,
  published_at timestamptz, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_request_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  name text NOT NULL, description text,
  quantity integer, dimensions text, notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_request_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_type text, file_size integer, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_request_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  artisan_id uuid NOT NULL,
  match_score numeric(5,2) NOT NULL DEFAULT 0,
  match_reasons text[] NOT NULL DEFAULT '{}'::text[],
  response_status public.match_response NOT NULL DEFAULT 'pendente'::public.match_response,
  decline_reason text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz, responded_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL,
  artisan_id uuid NOT NULL,
  product_id uuid, experience_id uuid,
  author_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text, artisan_reply text, replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews_legacy (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  artisan_user_id uuid NOT NULL,
  reviewer_name text NOT NULL, reviewer_city text,
  rating integer NOT NULL, comment text, product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- CHAVES, UNICIDADE E REGRAS DE INTEGRIDADE
-- Aplicadas de forma tolerante: se já existirem, seguem em frente.
-- ---------------------------------------------------------------------
DO $$
DECLARE cmd text;
BEGIN
  FOR cmd IN SELECT unnest(ARRAY[
    -- chaves primárias
    'ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.artisan_billing ADD CONSTRAINT artisan_billing_pkey PRIMARY KEY (artisan_id)',
    'ALTER TABLE public.materials ADD CONSTRAINT materials_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.styles ADD CONSTRAINT styles_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.techniques ADD CONSTRAINT techniques_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.artisan_materials ADD CONSTRAINT artisan_materials_pkey PRIMARY KEY (artisan_id, material_id)',
    'ALTER TABLE public.artisan_styles ADD CONSTRAINT artisan_styles_pkey PRIMARY KEY (artisan_id, style_id)',
    'ALTER TABLE public.artisan_techniques ADD CONSTRAINT artisan_techniques_pkey PRIMARY KEY (artisan_id, technique_id)',
    'ALTER TABLE public.artisan_offerings ADD CONSTRAINT artisan_offerings_pkey PRIMARY KEY (artisan_id, offering_type)',
    'ALTER TABLE public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.product_images ADD CONSTRAINT product_images_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.pagarme_events ADD CONSTRAINT pagarme_events_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.favorites ADD CONSTRAINT favorites_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.messages ADD CONSTRAINT messages_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.custom_request_items ADD CONSTRAINT custom_request_items_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.custom_request_attachments ADD CONSTRAINT custom_request_attachments_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.custom_request_matches ADD CONSTRAINT custom_request_matches_pkey PRIMARY KEY (id)',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey1 PRIMARY KEY (id)',
    'ALTER TABLE public.reviews_legacy ADD CONSTRAINT reviews_pkey PRIMARY KEY (id)',
    -- unicidade
    'ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id)',
    'ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_slug_key UNIQUE (slug)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_user_id_key UNIQUE (user_id)',
    'ALTER TABLE public.materials ADD CONSTRAINT materials_slug_key UNIQUE (slug)',
    'ALTER TABLE public.styles ADD CONSTRAINT styles_slug_key UNIQUE (slug)',
    'ALTER TABLE public.techniques ADD CONSTRAINT techniques_slug_key UNIQUE (slug)',
    'ALTER TABLE public.categories ADD CONSTRAINT categories_slug_key UNIQUE (slug)',
    'ALTER TABLE public.products ADD CONSTRAINT products_slug_key UNIQUE (slug)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_slug_key UNIQUE (slug)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_pagarme_order_id_key UNIQUE (pagarme_order_id)',
    'ALTER TABLE public.pagarme_events ADD CONSTRAINT pagarme_events_event_id_key UNIQUE (event_id)',
    'ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_product_id_key UNIQUE (user_id, product_id)',
    'ALTER TABLE public.custom_request_matches ADD CONSTRAINT custom_request_matches_request_id_artisan_id_key UNIQUE (request_id, artisan_id)',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_item_id_key UNIQUE (order_item_id)',
    -- chaves estrangeiras
    'ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_billing ADD CONSTRAINT artisan_billing_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_materials ADD CONSTRAINT artisan_materials_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_materials ADD CONSTRAINT artisan_materials_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_styles ADD CONSTRAINT artisan_styles_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_styles ADD CONSTRAINT artisan_styles_style_id_fkey FOREIGN KEY (style_id) REFERENCES public.styles(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_techniques ADD CONSTRAINT artisan_techniques_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_techniques ADD CONSTRAINT artisan_techniques_technique_id_fkey FOREIGN KEY (technique_id) REFERENCES public.techniques(id) ON DELETE CASCADE',
    'ALTER TABLE public.artisan_offerings ADD CONSTRAINT artisan_offerings_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.products ADD CONSTRAINT products_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.products ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL',
    'ALTER TABLE public.product_images ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE RESTRICT',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES public.experiences(id) ON DELETE SET NULL',
    'ALTER TABLE public.pagarme_events ADD CONSTRAINT pagarme_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL',
    'ALTER TABLE public.favorites ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.favorites ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE',
    'ALTER TABLE public.conversations ADD CONSTRAINT conversations_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.conversations ADD CONSTRAINT conversations_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.conversations ADD CONSTRAINT conversations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL',
    'ALTER TABLE public.conversations ADD CONSTRAINT conversations_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_requests(id) ON DELETE CASCADE',
    'ALTER TABLE public.messages ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE',
    'ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_source_product_id_fkey FOREIGN KEY (source_product_id) REFERENCES public.products(id) ON DELETE SET NULL',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_selected_artisan_id_fkey FOREIGN KEY (selected_artisan_id) REFERENCES public.artisans(id) ON DELETE SET NULL',
    'ALTER TABLE public.custom_request_items ADD CONSTRAINT custom_request_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_requests(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_request_attachments ADD CONSTRAINT custom_request_attachments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_requests(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_request_attachments ADD CONSTRAINT custom_request_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_request_matches ADD CONSTRAINT custom_request_matches_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_requests(id) ON DELETE CASCADE',
    'ALTER TABLE public.custom_request_matches ADD CONSTRAINT custom_request_matches_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_artisan_id_fkey FOREIGN KEY (artisan_id) REFERENCES public.artisans(id) ON DELETE CASCADE',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_experience_id_fkey FOREIGN KEY (experience_id) REFERENCES public.experiences(id) ON DELETE SET NULL',
    'ALTER TABLE public.reviews_legacy ADD CONSTRAINT reviews_artisan_user_id_fkey FOREIGN KEY (artisan_user_id) REFERENCES auth.users(id) ON DELETE CASCADE',
    -- regras de negócio
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_slug_check CHECK (slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'')',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_status_check CHECK (status = ANY (ARRAY[''pending''::text, ''active''::text, ''suspended''::text]))',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_years_of_experience_check CHECK (years_of_experience >= 0 AND years_of_experience <= 90)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_production_capacity_monthly_check CHECK (production_capacity_monthly >= 0)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_average_production_days_check CHECK (average_production_days >= 0)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_minimum_order_days_check CHECK (minimum_order_days >= 0)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_team_size_check CHECK (team_size >= 0)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_min_order_value_cents_check CHECK (min_order_value_cents >= 0)',
    'ALTER TABLE public.artisans ADD CONSTRAINT artisans_corporate_min_quantity_check CHECK (corporate_min_quantity >= 0)',
    'ALTER TABLE public.categories ADD CONSTRAINT categories_slug_check CHECK (slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'')',
    'ALTER TABLE public.products ADD CONSTRAINT products_slug_check CHECK (slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'')',
    'ALTER TABLE public.products ADD CONSTRAINT products_title_check CHECK (length(TRIM(BOTH FROM title)) > 0)',
    'ALTER TABLE public.products ADD CONSTRAINT products_price_cents_check CHECK (price_cents > 0)',
    'ALTER TABLE public.products ADD CONSTRAINT products_check CHECK (compare_at_price_cents > price_cents)',
    'ALTER TABLE public.products ADD CONSTRAINT products_stock_quantity_check CHECK (stock_quantity >= 0)',
    'ALTER TABLE public.products ADD CONSTRAINT products_weight_grams_check CHECK (weight_grams > 0)',
    'ALTER TABLE public.products ADD CONSTRAINT peca_unica_tem_no_maximo_uma_unidade CHECK (stock_mode <> ''unique''::public.stock_mode OR stock_quantity <= 1)',
    'ALTER TABLE public.product_images ADD CONSTRAINT product_images_tint_check CHECK (tint ~ ''^#[0-9A-Fa-f]{6}$'')',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_slug_check CHECK (slug ~ ''^[a-z0-9]+(-[a-z0-9]+)*$'')',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_title_check CHECK (length(TRIM(BOTH FROM title)) > 0)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_price_cents_check CHECK (price_cents > 0)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_duration_minutes_check CHECK (duration_minutes > 0)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_capacity_check CHECK (capacity > 0)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_seats_taken_check CHECK (seats_taken >= 0)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiences_cover_tint_check CHECK (cover_tint ~ ''^#[0-9A-Fa-f]{6}$'')',
    'ALTER TABLE public.experiences ADD CONSTRAINT vagas_nao_excedem_capacidade CHECK (capacity IS NULL OR seats_taken <= capacity)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiencia_ao_vivo_tem_data CHECK (kind = ''recorded''::public.experience_kind OR starts_at IS NOT NULL)',
    'ALTER TABLE public.experiences ADD CONSTRAINT experiencia_gravada_nao_tem_agenda CHECK (kind <> ''recorded''::public.experience_kind OR (starts_at IS NULL AND capacity IS NULL))',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_cents_check CHECK (subtotal_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_shipping_cents_check CHECK (shipping_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_discount_cents_check CHECK (discount_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_total_cents_check CHECK (total_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_platform_fee_cents_check CHECK (platform_fee_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_service_fee_cents_check CHECK (service_fee_cents >= 0)',
    'ALTER TABLE public.orders ADD CONSTRAINT orders_installments_check CHECK (installments >= 1 AND installments <= 12)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_unit_price_cents_check CHECK (unit_price_cents > 0)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_total_cents_check CHECK (total_cents > 0)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_commission_bps_check CHECK (commission_bps >= 0 AND commission_bps <= 10000)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_platform_fee_cents_check CHECK (platform_fee_cents >= 0)',
    'ALTER TABLE public.order_items ADD CONSTRAINT order_items_artisan_amount_cents_check CHECK (artisan_amount_cents >= 0)',
    -- comissão + repasse tem de fechar exatamente com o total do item
    'ALTER TABLE public.order_items ADD CONSTRAINT split_fecha_com_o_total CHECK (platform_fee_cents + artisan_amount_cents = total_cents)',
    'ALTER TABLE public.order_items ADD CONSTRAINT item_referencia_o_tipo_certo CHECK ((kind = ''product''::public.order_item_kind AND product_id IS NOT NULL AND experience_id IS NULL) OR (kind = ''experience''::public.order_item_kind AND experience_id IS NOT NULL AND product_id IS NULL))',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_linha_unica CHECK (id)',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_default_commission_bps_check CHECK (default_commission_bps >= 0 AND default_commission_bps <= 10000)',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_service_fee_pix_bps_check CHECK (service_fee_pix_bps >= 0 AND service_fee_pix_bps <= 2000)',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_service_fee_card_bps_check CHECK (service_fee_card_bps >= 0 AND service_fee_card_bps <= 2000)',
    'ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_service_fee_boleto_cents_check CHECK (service_fee_boleto_cents >= 0)',
    'ALTER TABLE public.messages ADD CONSTRAINT messages_body_check CHECK (length(TRIM(BOTH FROM body)) > 0 AND length(body) <= 4000)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_quantity_min_check CHECK (quantity_min > 0)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_quantity_max_check CHECK (quantity_max > 0)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_budget_min_cents_check CHECK (budget_min_cents >= 0)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_budget_max_cents_check CHECK (budget_max_cents >= 0)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT custom_requests_max_proposals_check CHECK (max_proposals >= 1 AND max_proposals <= 10)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT faixa_de_orcamento_coerente CHECK (budget_max_cents IS NULL OR budget_min_cents IS NULL OR budget_max_cents >= budget_min_cents)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT faixa_de_quantidade_coerente CHECK (quantity_max IS NULL OR quantity_min IS NULL OR quantity_max >= quantity_min)',
    'ALTER TABLE public.custom_requests ADD CONSTRAINT artesao_especifico_tem_artesao CHECK (distribution_mode <> ''artesao_especifico''::public.distribution_mode OR selected_artisan_id IS NOT NULL)',
    'ALTER TABLE public.custom_request_items ADD CONSTRAINT custom_request_items_quantity_check CHECK (quantity > 0)',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check1 CHECK (rating >= 1 AND rating <= 5)',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_comment_check CHECK (comment IS NULL OR length(comment) <= 2000)',
    'ALTER TABLE public.reviews ADD CONSTRAINT reviews_artisan_reply_check CHECK (artisan_reply IS NULL OR length(artisan_reply) <= 2000)',
    'ALTER TABLE public.reviews_legacy ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5)'
  ])
  LOOP
    BEGIN
      EXECUTE cmd;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN duplicate_table THEN NULL;
      WHEN invalid_table_definition THEN NULL;
      WHEN others THEN RAISE NOTICE 'ignorado: % (%)', cmd, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS artisans_status_idx ON public.artisans (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS products_artisan_idx ON public.products (artisan_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_vitrine_idx ON public.products (created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images (product_id, position);
CREATE INDEX IF NOT EXISTS experiences_artisan_idx ON public.experiences (artisan_id);
CREATE INDEX IF NOT EXISTS experiences_agenda_idx ON public.experiences (starts_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON public.orders (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_artisan_idx ON public.order_items (artisan_id);
CREATE INDEX IF NOT EXISTS pagarme_events_order_idx ON public.pagarme_events (order_id);
CREATE INDEX IF NOT EXISTS conversations_artisan_idx ON public.conversations (artisan_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_buyer_idx ON public.conversations (buyer_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_request_idx ON public.conversations (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_unicidade ON public.conversations
  (artisan_id, buyer_user_id, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(request_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS custom_requests_buyer_idx ON public.custom_requests (buyer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS custom_requests_status_idx ON public.custom_requests (status);
CREATE INDEX IF NOT EXISTS custom_request_items_idx ON public.custom_request_items (request_id, position);
CREATE INDEX IF NOT EXISTS custom_request_attachments_idx ON public.custom_request_attachments (request_id);
CREATE INDEX IF NOT EXISTS custom_request_matches_artisan_idx ON public.custom_request_matches (artisan_id, response_status, sent_at DESC);
CREATE INDEX IF NOT EXISTS reviews_artisan_idx ON public.reviews (artisan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews (product_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagarme_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews_legacy ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- FUNÇÕES — schema private
--
-- Ficam fora do schema exposto pela API: as policies chamam as fachadas
-- em public, que apenas delegam para cá. criar_pedido() é o coração da
-- operação — recalcula o preço a partir do banco, congela a comissão por
-- item e trava a linha do produto com FOR UPDATE antes de conferir o
-- estoque, o que evita vender a mesma peça duas vezes.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $function$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$function$;

CREATE OR REPLACE FUNCTION private.my_artisan_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT id FROM public.artisans WHERE user_id = auth.uid() $function$;

CREATE OR REPLACE FUNCTION private.owns_artisan(_artisan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.artisans WHERE id = _artisan_id AND user_id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION private.pedido_tem_item_meu(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.artisans a ON a.id = oi.artisan_id
    WHERE oi.order_id = _order_id AND a.user_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION private.participa_da_conversa(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artisans a ON a.id = c.artisan_id
    WHERE c.id = _conversation_id AND (c.buyer_user_id = auth.uid() OR a.user_id = auth.uid())
  )
$function$;

CREATE OR REPLACE FUNCTION private.pode_avaliar(_order_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = _order_item_id AND o.buyer_user_id = auth.uid() AND o.status = 'delivered'
  )
$function$;

CREATE OR REPLACE FUNCTION private.encomenda_e_minha(_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_request_matches m
    JOIN public.artisans a ON a.id = m.artisan_id
    WHERE m.request_id = _request_id AND a.user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION private.comissao_bps(_artisan_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT commission_bps FROM public.artisan_billing WHERE artisan_id = _artisan_id),
    (SELECT default_commission_bps FROM public.platform_settings WHERE id)
  );
$function$;

CREATE OR REPLACE FUNCTION private.taxa_de_servico(_subtotal_cents integer, _metodo public.payment_method)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE _metodo
    WHEN 'pix'         THEN (_subtotal_cents * (SELECT service_fee_pix_bps  FROM public.platform_settings WHERE id)) / 10000
    WHEN 'credit_card' THEN (_subtotal_cents * (SELECT service_fee_card_bps FROM public.platform_settings WHERE id)) / 10000
    WHEN 'boleto'      THEN (SELECT service_fee_boleto_cents FROM public.platform_settings WHERE id)
  END;
$function$;

CREATE OR REPLACE FUNCTION private.avaliacao_apenas_resposta(_id uuid, _rating smallint, _comment text, _author_id uuid, _order_item_id uuid, _artisan_id uuid, _product_id uuid, _experience_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = _id
      AND r.rating IS NOT DISTINCT FROM _rating
      AND r.comment IS NOT DISTINCT FROM _comment
      AND r.author_id IS NOT DISTINCT FROM _author_id
      AND r.order_item_id IS NOT DISTINCT FROM _order_item_id
      AND r.artisan_id IS NOT DISTINCT FROM _artisan_id
      AND r.product_id IS NOT DISTINCT FROM _product_id
      AND r.experience_id IS NOT DISTINCT FROM _experience_id
  );
$function$;

CREATE OR REPLACE FUNCTION private.caminho_e_da_minha_loja(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _primeiro TEXT; _uuid UUID;
BEGIN
  _primeiro := (storage.foldername(_name))[1];
  IF _primeiro IS NULL THEN RETURN FALSE; END IF;
  BEGIN _uuid := _primeiro::UUID;
  EXCEPTION WHEN invalid_text_representation THEN RETURN FALSE; END;
  RETURN private.owns_artisan(_uuid);
END;
$function$;

CREATE OR REPLACE FUNCTION private.participa_da_encomenda_no_caminho(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _primeiro TEXT; _uuid UUID;
BEGIN
  _primeiro := (storage.foldername(_name))[1];
  IF _primeiro IS NULL THEN RETURN FALSE; END IF;
  BEGIN _uuid := _primeiro::UUID;
  EXCEPTION WHEN invalid_text_representation THEN RETURN FALSE; END;
  RETURN EXISTS (
    SELECT 1 FROM public.custom_requests r
    WHERE r.id = _uuid AND (r.buyer_user_id = auth.uid() OR private.encomenda_e_minha(r.id))
  );
END;
$function$;

-- Criação do pedido: preço sempre recalculado no servidor.
CREATE OR REPLACE FUNCTION private.criar_pedido(_itens jsonb, _buyer_name text, _buyer_email text, _buyer_phone text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _shipping jsonb DEFAULT '{}'::jsonb, _shipping_cents integer DEFAULT 0)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _pedido public.orders; _item JSONB; _qtd INTEGER; _produto public.products; _exp public.experiences;
  _bps INTEGER; _total INTEGER; _taxa INTEGER; _subtotal INTEGER := 0; _taxa_total INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado para comprar'; END IF;
  IF _itens IS NULL OR jsonb_array_length(_itens) = 0 THEN RAISE EXCEPTION 'Carrinho vazio'; END IF;

  INSERT INTO public.orders (
    buyer_user_id, buyer_email, buyer_name, buyer_phone, buyer_document, shipping_cents,
    shipping_zipcode, shipping_street, shipping_number, shipping_complement,
    shipping_district, shipping_city, shipping_state
  ) VALUES (
    auth.uid(), _buyer_email, _buyer_name, _buyer_phone, _buyer_document, GREATEST(_shipping_cents, 0),
    _shipping->>'zipcode', _shipping->>'street', _shipping->>'number',
    _shipping->>'complement', _shipping->>'district', _shipping->>'city', _shipping->>'state'
  ) RETURNING * INTO _pedido;

  FOR _item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    _qtd := GREATEST(COALESCE((_item->>'quantity')::INTEGER, 1), 1);
    IF _item->>'kind' = 'product' THEN
      SELECT * INTO _produto FROM public.products WHERE id = (_item->>'id')::UUID FOR UPDATE;
      IF NOT FOUND OR _produto.status <> 'active' THEN RAISE EXCEPTION 'Peça indisponível: %', _item->>'id'; END IF;
      IF _produto.stock_quantity < _qtd THEN RAISE EXCEPTION 'Estoque insuficiente para "%"', _produto.title; END IF;
      _bps := private.comissao_bps(_produto.artisan_id);
      _total := _produto.price_cents * _qtd;
      _taxa := (_total * _bps) / 10000;
      INSERT INTO public.order_items (order_id, kind, product_id, artisan_id, title, unit_price_cents, quantity, total_cents, commission_bps, platform_fee_cents, artisan_amount_cents)
      VALUES (_pedido.id, 'product', _produto.id, _produto.artisan_id, _produto.title, _produto.price_cents, _qtd, _total, _bps, _taxa, _total - _taxa);
    ELSIF _item->>'kind' = 'experience' THEN
      SELECT * INTO _exp FROM public.experiences WHERE id = (_item->>'id')::UUID FOR UPDATE;
      IF NOT FOUND OR _exp.status <> 'active' THEN RAISE EXCEPTION 'Experiência indisponível: %', _item->>'id'; END IF;
      IF _exp.capacity IS NOT NULL AND _exp.seats_taken + _qtd > _exp.capacity THEN RAISE EXCEPTION 'Não há % vaga(s) em "%"', _qtd, _exp.title; END IF;
      _bps := private.comissao_bps(_exp.artisan_id);
      _total := _exp.price_cents * _qtd;
      _taxa := (_total * _bps) / 10000;
      INSERT INTO public.order_items (order_id, kind, experience_id, artisan_id, title, unit_price_cents, quantity, total_cents, commission_bps, platform_fee_cents, artisan_amount_cents)
      VALUES (_pedido.id, 'experience', _exp.id, _exp.artisan_id, _exp.title, _exp.price_cents, _qtd, _total, _bps, _taxa, _total - _taxa);
    ELSE
      RAISE EXCEPTION 'Tipo de item desconhecido: %', _item->>'kind';
    END IF;
    _subtotal := _subtotal + _total;
    _taxa_total := _taxa_total + _taxa;
  END LOOP;

  UPDATE public.orders
  SET subtotal_cents = _subtotal, platform_fee_cents = _taxa_total,
      total_cents = _subtotal + GREATEST(_shipping_cents, 0)
  WHERE id = _pedido.id RETURNING * INTO _pedido;

  RETURN _pedido;
END;
$function$;

CREATE OR REPLACE FUNCTION private.definir_pagamento(_order_id uuid, _metodo public.payment_method, _installments integer DEFAULT 1)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _pedido public.orders; _taxa INTEGER;
BEGIN
  SELECT * INTO _pedido FROM public.orders WHERE id = _order_id AND buyer_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF _pedido.status <> 'pending' THEN RAISE EXCEPTION 'Este pedido já foi processado'; END IF;
  _taxa := private.taxa_de_servico(_pedido.subtotal_cents, _metodo);
  UPDATE public.orders
  SET payment_method = _metodo,
      installments = CASE WHEN _metodo = 'credit_card' THEN GREATEST(_installments, 1) ELSE 1 END,
      service_fee_cents = _taxa,
      total_cents = _pedido.subtotal_cents + _pedido.shipping_cents - _pedido.discount_cents + _taxa
  WHERE id = _order_id RETURNING * INTO _pedido;
  RETURN _pedido;
END;
$function$;

CREATE OR REPLACE FUNCTION private.criar_minha_loja(_shop_name text, _slug text, _city text DEFAULT NULL::text, _state character DEFAULT NULL::bpchar, _bio text DEFAULT NULL::text)
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _nova public.artisans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado'; END IF;
  INSERT INTO public.artisans (user_id, shop_name, slug, city, state, bio)
  VALUES (auth.uid(), _shop_name, lower(_slug), _city, _state, _bio) RETURNING * INTO _nova;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'artisan') ON CONFLICT DO NOTHING;
  RETURN _nova;
END;
$function$;

CREATE OR REPLACE FUNCTION private.garantir_minha_loja(_shop_name text DEFAULT NULL::text)
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _loja public.artisans; _base TEXT; _slug TEXT; _n INTEGER := 1;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado'; END IF;
  SELECT * INTO _loja FROM public.artisans WHERE user_id = auth.uid();
  IF FOUND THEN RETURN _loja; END IF;
  _base := NULLIF(public.gerar_slug(COALESCE(_shop_name, 'atelie')), '');
  _base := COALESCE(_base, 'atelie');
  _slug := _base;
  WHILE EXISTS (SELECT 1 FROM public.artisans WHERE slug = _slug) LOOP
    _n := _n + 1; _slug := _base || '-' || _n;
  END LOOP;
  INSERT INTO public.artisans (user_id, shop_name, slug, status)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_shop_name), ''), 'Meu Ateliê'), _slug, 'pending')
  RETURNING * INTO _loja;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'artisan') ON CONFLICT DO NOTHING;
  RETURN _loja;
END;
$function$;

CREATE OR REPLACE FUNCTION private.concluir_onboarding()
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _loja public.artisans;
BEGIN
  UPDATE public.artisans
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, now()), onboarding_step = NULL
  WHERE user_id = auth.uid() RETURNING * INTO _loja;
  IF NOT FOUND THEN RAISE EXCEPTION 'Loja não encontrada'; END IF;
  RETURN _loja;
END;
$function$;

CREATE OR REPLACE FUNCTION private.progresso_da_loja(_artisan_id uuid)
RETURNS TABLE(etapa text, rotulo text, concluida boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT * FROM (
    SELECT 'conta' AS etapa, 'Conta criada' AS rotulo, TRUE AS concluida
    UNION ALL SELECT 'nome', 'Nome da loja informado',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND shop_name IS NOT NULL AND shop_name <> 'Meu Ateliê')
    UNION ALL SELECT 'cidade', 'Cidade adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND city IS NOT NULL)
    UNION ALL SELECT 'historia', 'História adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND length(coalesce(bio, '')) >= 40)
    UNION ALL SELECT 'materiais', 'Materiais informados',
      EXISTS (SELECT 1 FROM artisan_materials WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'tecnicas', 'Técnicas informadas',
      EXISTS (SELECT 1 FROM artisan_techniques WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'foto', 'Foto adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND avatar_url IS NOT NULL)
    UNION ALL SELECT 'atelie', 'Foto do ateliê adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND workshop_image_url IS NOT NULL)
    UNION ALL SELECT 'vendas', 'Formas de venda informadas',
      EXISTS (SELECT 1 FROM artisan_offerings WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'peca', 'Primeira peça publicada',
      EXISTS (SELECT 1 FROM products WHERE artisan_id = _artisan_id AND status = 'active')
    UNION ALL SELECT 'experiencia', 'Primeira experiência publicada',
      EXISTS (SELECT 1 FROM experiences WHERE artisan_id = _artisan_id AND status = 'active')
  ) t
$function$;

CREATE OR REPLACE FUNCTION private.distribuir_encomenda(_request_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _req public.custom_requests; _inseridos INTEGER := 0;
BEGIN
  SELECT * INTO _req FROM public.custom_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encomenda não encontrada'; END IF;
  IF _req.buyer_user_id <> auth.uid() AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Somente quem criou a encomenda pode distribuí-la';
  END IF;

  IF _req.distribution_mode = 'artesao_especifico' THEN
    INSERT INTO public.custom_request_matches (request_id, artisan_id, match_score, match_reasons)
    VALUES (_request_id, _req.selected_artisan_id, 100, ARRAY['escolhido pelo comprador'])
    ON CONFLICT DO NOTHING;
    RETURN 1;
  END IF;

  WITH candidatos AS (
    SELECT a.id,
      (30
        + CASE WHEN _req.delivery_state IS NOT NULL AND a.state = _req.delivery_state THEN 20 ELSE 0 END
        + CASE WHEN _req.delivery_city IS NOT NULL AND a.city = _req.delivery_city THEN 10 ELSE 0 END
        + CASE WHEN _req.quantity_min IS NOT NULL AND _req.quantity_min > 50 AND a.accepts_large_orders THEN 20 ELSE 0 END
        + CASE WHEN a.verified THEN 10 ELSE 0 END
        + CASE WHEN EXISTS (SELECT 1 FROM public.products p WHERE p.artisan_id = a.id AND p.status = 'active') THEN 10 ELSE 0 END
        + COALESCE((SELECT LEAST(r.average_rating, 5) * 2 FROM public.artisan_ratings r WHERE r.artisan_id = a.id), 0)
      )::NUMERIC AS score,
      ARRAY_REMOVE(ARRAY[
        'aceita encomendas',
        CASE WHEN _req.delivery_state IS NOT NULL AND a.state = _req.delivery_state THEN 'mesmo estado' END,
        CASE WHEN _req.quantity_min IS NOT NULL AND _req.quantity_min > 50 AND a.accepts_large_orders THEN 'aceita grandes pedidos' END,
        CASE WHEN a.verified THEN 'loja verificada' END
      ], NULL) AS razoes
    FROM public.artisans a
    WHERE a.status = 'active' AND a.accepts_custom_orders
      AND (_req.quantity_min IS NULL OR a.production_capacity_monthly IS NULL
           OR a.production_capacity_monthly >= _req.quantity_min)
  )
  INSERT INTO public.custom_request_matches (request_id, artisan_id, match_score, match_reasons)
  SELECT _request_id, id, score, razoes FROM candidatos
  ORDER BY score DESC LIMIT _req.max_proposals ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _inseridos = ROW_COUNT;
  RETURN _inseridos;
END;
$function$;

CREATE OR REPLACE FUNCTION private.enviar_encomenda(_request_id uuid)
RETURNS public.custom_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _req public.custom_requests; _encontrados INTEGER;
BEGIN
  SELECT * INTO _req FROM public.custom_requests WHERE id = _request_id AND buyer_user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encomenda não encontrada'; END IF;
  IF _req.status <> 'rascunho' THEN RAISE EXCEPTION 'Esta encomenda já foi enviada'; END IF;
  IF COALESCE(length(trim(_req.description)), 0) < 10 THEN
    RAISE EXCEPTION 'Conte um pouco mais sobre o que você precisa antes de enviar';
  END IF;
  UPDATE public.custom_requests
  SET status = 'em_distribuicao', published_at = now(),
      expires_at = COALESCE(expires_at, now() + INTERVAL '30 days')
  WHERE id = _request_id RETURNING * INTO _req;
  _encontrados := private.distribuir_encomenda(_request_id);
  UPDATE public.custom_requests
  SET status = CASE WHEN _encontrados > 0 THEN 'recebendo_propostas'::public.request_status
                    ELSE 'em_distribuicao'::public.request_status END
  WHERE id = _request_id RETURNING * INTO _req;
  RETURN _req;
END;
$function$;

CREATE OR REPLACE FUNCTION private.responder_encomenda(_request_id uuid, _resposta public.match_response, _motivo text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _artisan UUID;
BEGIN
  _artisan := private.my_artisan_id();
  IF _artisan IS NULL THEN RAISE EXCEPTION 'Somente artesãos respondem encomendas'; END IF;
  UPDATE public.custom_request_matches
  SET response_status = _resposta,
      decline_reason = CASE WHEN _resposta = 'recusada' THEN _motivo ELSE decline_reason END,
      responded_at = now(), viewed_at = COALESCE(viewed_at, now())
  WHERE request_id = _request_id AND artisan_id = _artisan;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta encomenda não foi enviada para você'; END IF;
  IF _resposta IN ('interessado', 'mais_informacoes') THEN
    INSERT INTO public.conversations (artisan_id, buyer_user_id, request_id)
    SELECT _artisan, r.buyer_user_id, r.id FROM public.custom_requests r WHERE r.id = _request_id
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------
-- FUNÇÕES — schema public (fachada chamável pelo app via RPC)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.unaccent_simples(_texto text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT translate(_texto,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN');
$function$;

CREATE OR REPLACE FUNCTION public.gerar_slug(_texto text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT trim(both '-' from regexp_replace(lower(public.unaccent_simples(_texto)), '[^a-z0-9]+', '-', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.has_role(_user_id, _role) $function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.is_admin() $function$;

CREATE OR REPLACE FUNCTION public.my_artisan_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.my_artisan_id() $function$;

CREATE OR REPLACE FUNCTION public.owns_artisan(_artisan_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.owns_artisan(_artisan_id) $function$;

CREATE OR REPLACE FUNCTION public.pedido_tem_item_meu(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.pedido_tem_item_meu(_order_id) $function$;

CREATE OR REPLACE FUNCTION public.participa_da_conversa(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.participa_da_conversa(_conversation_id) $function$;

CREATE OR REPLACE FUNCTION public.pode_avaliar(_order_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.pode_avaliar(_order_item_id) $function$;

CREATE OR REPLACE FUNCTION public.encomenda_e_minha(_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.encomenda_e_minha(_request_id) $function$;

CREATE OR REPLACE FUNCTION public.comissao_bps(_artisan_id uuid)
RETURNS integer LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.comissao_bps(_artisan_id) $function$;

CREATE OR REPLACE FUNCTION public.taxa_de_servico(_subtotal_cents integer, _metodo public.payment_method)
RETURNS integer LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.taxa_de_servico(_subtotal_cents, _metodo) $function$;

CREATE OR REPLACE FUNCTION public.avaliacao_apenas_resposta(_id uuid, _rating smallint, _comment text, _author_id uuid, _order_item_id uuid, _artisan_id uuid, _product_id uuid, _experience_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.avaliacao_apenas_resposta(_id, _rating, _comment, _author_id, _order_item_id, _artisan_id, _product_id, _experience_id) $function$;

CREATE OR REPLACE FUNCTION public.caminho_e_da_minha_loja(_name text)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.caminho_e_da_minha_loja(_name) $function$;

CREATE OR REPLACE FUNCTION public.participa_da_encomenda_no_caminho(_name text)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT private.participa_da_encomenda_no_caminho(_name) $function$;

CREATE OR REPLACE FUNCTION public.criar_pedido(_itens jsonb, _buyer_name text, _buyer_email text, _buyer_phone text DEFAULT NULL::text, _buyer_document text DEFAULT NULL::text, _shipping jsonb DEFAULT '{}'::jsonb, _shipping_cents integer DEFAULT 0)
RETURNS public.orders LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.criar_pedido(_itens, _buyer_name, _buyer_email, _buyer_phone, _buyer_document, _shipping, _shipping_cents) $function$;

CREATE OR REPLACE FUNCTION public.definir_pagamento(_order_id uuid, _metodo public.payment_method, _installments integer DEFAULT 1)
RETURNS public.orders LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.definir_pagamento(_order_id, _metodo, _installments) $function$;

CREATE OR REPLACE FUNCTION public.criar_minha_loja(_shop_name text, _slug text, _city text DEFAULT NULL::text, _state character DEFAULT NULL::bpchar, _bio text DEFAULT NULL::text)
RETURNS public.artisans LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.criar_minha_loja(_shop_name, _slug, _city, _state, _bio) $function$;

CREATE OR REPLACE FUNCTION public.garantir_minha_loja(_shop_name text DEFAULT NULL::text)
RETURNS public.artisans LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.garantir_minha_loja(_shop_name) $function$;

CREATE OR REPLACE FUNCTION public.concluir_onboarding()
RETURNS public.artisans LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.concluir_onboarding() $function$;

CREATE OR REPLACE FUNCTION public.progresso_da_loja(_artisan_id uuid)
RETURNS TABLE(etapa text, rotulo text, concluida boolean)
LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT * FROM private.progresso_da_loja(_artisan_id) $function$;

CREATE OR REPLACE FUNCTION public.distribuir_encomenda(_request_id uuid)
RETURNS integer LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.distribuir_encomenda(_request_id) $function$;

CREATE OR REPLACE FUNCTION public.enviar_encomenda(_request_id uuid)
RETURNS public.custom_requests LANGUAGE sql SET search_path TO 'public'
AS $function$ SELECT private.enviar_encomenda(_request_id) $function$;

CREATE OR REPLACE FUNCTION public.responder_encomenda(_request_id uuid, _resposta public.match_response, _motivo text DEFAULT NULL::text)
RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN PERFORM private.responder_encomenda(_request_id, _resposta, _motivo); END; $function$;

-- ---------------------------------------------------------------------
-- FUNÇÕES DE TRIGGER
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Baixa estoque ao pagar e devolve ao cancelar/estornar.
CREATE OR REPLACE FUNCTION public.baixar_estoque_no_pagamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _it RECORD;
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    FOR _it IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      IF _it.kind = 'product' AND _it.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(stock_quantity - _it.quantity, 0),
            status = CASE WHEN stock_quantity - _it.quantity <= 0 THEN 'sold_out'::public.listing_status ELSE status END
        WHERE id = _it.product_id;
      ELSIF _it.kind = 'experience' AND _it.experience_id IS NOT NULL THEN
        UPDATE public.experiences
        SET seats_taken = seats_taken + _it.quantity,
            status = CASE WHEN capacity IS NOT NULL AND seats_taken + _it.quantity >= capacity
                          THEN 'sold_out'::public.listing_status ELSE status END
        WHERE id = _it.experience_id;
      END IF;
    END LOOP;
    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  IF NEW.status IN ('canceled', 'refunded') AND OLD.status = 'paid' THEN
    FOR _it IN SELECT * FROM public.order_items WHERE order_id = NEW.id LOOP
      IF _it.kind = 'product' AND _it.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + _it.quantity,
            status = CASE WHEN status = 'sold_out' THEN 'active'::public.listing_status ELSE status END
        WHERE id = _it.product_id;
      ELSIF _it.kind = 'experience' AND _it.experience_id IS NOT NULL THEN
        UPDATE public.experiences
        SET seats_taken = GREATEST(seats_taken - _it.quantity, 0),
            status = CASE WHEN status = 'sold_out' THEN 'active'::public.listing_status ELSE status END
        WHERE id = _it.experience_id;
      END IF;
    END LOOP;
    NEW.canceled_at := COALESCE(NEW.canceled_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- O artesão pode mexer no status do pedido, mas não em valor nem em dado do comprador.
CREATE OR REPLACE FUNCTION public.pedido_artesao_so_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin() OR OLD.buyer_user_id = auth.uid() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.pedido_tem_item_meu(OLD.id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.number IS DISTINCT FROM OLD.number
       OR NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id
       OR NEW.buyer_email IS DISTINCT FROM OLD.buyer_email
       OR NEW.buyer_name IS DISTINCT FROM OLD.buyer_name
       OR NEW.buyer_phone IS DISTINCT FROM OLD.buyer_phone
       OR NEW.buyer_document IS DISTINCT FROM OLD.buyer_document
       OR NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
       OR NEW.shipping_cents IS DISTINCT FROM OLD.shipping_cents
       OR NEW.discount_cents IS DISTINCT FROM OLD.discount_cents
       OR NEW.total_cents IS DISTINCT FROM OLD.total_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.shipping_zipcode IS DISTINCT FROM OLD.shipping_zipcode
       OR NEW.shipping_street IS DISTINCT FROM OLD.shipping_street
       OR NEW.shipping_number IS DISTINCT FROM OLD.shipping_number
       OR NEW.shipping_complement IS DISTINCT FROM OLD.shipping_complement
       OR NEW.shipping_district IS DISTINCT FROM OLD.shipping_district
       OR NEW.shipping_city IS DISTINCT FROM OLD.shipping_city
       OR NEW.shipping_state IS DISTINCT FROM OLD.shipping_state
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.pagarme_order_id IS DISTINCT FROM OLD.pagarme_order_id
       OR NEW.pagarme_charge_id IS DISTINCT FROM OLD.pagarme_charge_id
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'O artesão só pode atualizar o status do pedido';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.artesao_so_responde()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.author_id AND NOT public.is_admin() THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.comment IS DISTINCT FROM OLD.comment
       OR NEW.author_id IS DISTINCT FROM OLD.author_id
       OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
       OR NEW.artisan_id IS DISTINCT FROM OLD.artisan_id
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.experience_id IS DISTINCT FROM OLD.experience_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'O artesão pode responder, mas não alterar a avaliação';
    END IF;
    IF NEW.artisan_reply IS DISTINCT FROM OLD.artisan_reply THEN NEW.replied_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.autor_nao_altera_resposta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = OLD.author_id AND NOT public.is_admin() THEN
    NEW.artisan_reply := OLD.artisan_reply;
    NEW.replied_at := OLD.replied_at;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mensagem_so_marca_lida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin() OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Só é permitido marcar a mensagem como lida';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- TRIGGERS
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS artisans_updated_at ON public.artisans;
CREATE TRIGGER artisans_updated_at BEFORE UPDATE ON public.artisans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS artisan_billing_updated_at ON public.artisan_billing;
CREATE TRIGGER artisan_billing_updated_at BEFORE UPDATE ON public.artisan_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS experiences_updated_at ON public.experiences;
CREATE TRIGGER experiences_updated_at BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS custom_requests_updated_at ON public.custom_requests;
CREATE TRIGGER custom_requests_updated_at BEFORE UPDATE ON public.custom_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS orders_baixa_estoque ON public.orders;
CREATE TRIGGER orders_baixa_estoque BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.baixar_estoque_no_pagamento();
DROP TRIGGER IF EXISTS orders_artesao_so_status ON public.orders;
CREATE TRIGGER orders_artesao_so_status BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.pedido_artesao_so_status();
DROP TRIGGER IF EXISTS reviews_artesao_so_responde ON public.reviews;
CREATE TRIGGER reviews_artesao_so_responde BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.artesao_so_responde();
DROP TRIGGER IF EXISTS reviews_autor_nao_altera_resposta ON public.reviews;
CREATE TRIGGER reviews_autor_nao_altera_resposta BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.autor_nao_altera_resposta();
DROP TRIGGER IF EXISTS messages_so_marca_lida ON public.messages;
CREATE TRIGGER messages_so_marca_lida BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.mensagem_so_marca_lida();
DROP TRIGGER IF EXISTS messages_atualiza_conversa ON public.messages;
CREATE TRIGGER messages_atualiza_conversa AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_ultima_mensagem();

-- Gatilho de cadastro: sem ele, usuário novo fica sem perfil e sem papel.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- As funções em private nunca são chamadas diretamente pelo cliente.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- POLICIES (69)
-- Recriadas com DROP IF EXISTS antes, para o arquivo poder ser reaplicado.
-- ---------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Cada um vê o próprio perfil" ON public.profiles;
CREATE POLICY "Cada um vê o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
-- Restritas a authenticated: "TO public" inclui o papel anon. A checagem
-- auth.uid() = user_id já barrava o anônimo, mas conceder INSERT/UPDATE a
-- anon é frouxo — qualquer ajuste futuro na condição viraria brecha.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_roles: sem INSERT/UPDATE por usuário — papel não é autoatribuível.
DROP POLICY IF EXISTS "Cada um vê os próprios papéis" ON public.user_roles;
CREATE POLICY "Cada um vê os próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- artisans
DROP POLICY IF EXISTS "Lojas ativas são públicas" ON public.artisans;
CREATE POLICY "Lojas ativas são públicas" ON public.artisans
  FOR SELECT TO public USING (status = 'active'::text OR user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Artesão edita a própria loja" ON public.artisans;
CREATE POLICY "Artesão edita a própria loja" ON public.artisans
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin edita qualquer loja" ON public.artisans;
CREATE POLICY "Admin edita qualquer loja" ON public.artisans
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- artisan_billing: dado financeiro só o admin lê e altera.
DROP POLICY IF EXISTS "Somente admin lê dados financeiros" ON public.artisan_billing;
CREATE POLICY "Somente admin lê dados financeiros" ON public.artisan_billing
  FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Somente admin altera dados financeiros" ON public.artisan_billing;
CREATE POLICY "Somente admin altera dados financeiros" ON public.artisan_billing
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Artesão vê o andamento do próprio cadastro" ON public.artisan_billing;
CREATE POLICY "Artesão vê o andamento do próprio cadastro" ON public.artisan_billing
  FOR SELECT TO authenticated USING (public.owns_artisan(artisan_id));

-- taxonomia do artesão
DROP POLICY IF EXISTS "Materiais da loja são públicos" ON public.artisan_materials;
CREATE POLICY "Materiais da loja são públicos" ON public.artisan_materials FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Artesão gerencia os próprios materiais" ON public.artisan_materials;
CREATE POLICY "Artesão gerencia os próprios materiais" ON public.artisan_materials
  FOR ALL TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Estilos da loja são públicos" ON public.artisan_styles;
CREATE POLICY "Estilos da loja são públicos" ON public.artisan_styles FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Artesão gerencia os próprios estilos" ON public.artisan_styles;
CREATE POLICY "Artesão gerencia os próprios estilos" ON public.artisan_styles
  FOR ALL TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Técnicas da loja são públicas" ON public.artisan_techniques;
CREATE POLICY "Técnicas da loja são públicas" ON public.artisan_techniques FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Artesão gerencia as próprias técnicas" ON public.artisan_techniques;
CREATE POLICY "Artesão gerencia as próprias técnicas" ON public.artisan_techniques
  FOR ALL TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Ofertas da loja são públicas" ON public.artisan_offerings;
CREATE POLICY "Ofertas da loja são públicas" ON public.artisan_offerings FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Artesão gerencia as próprias ofertas" ON public.artisan_offerings;
CREATE POLICY "Artesão gerencia as próprias ofertas" ON public.artisan_offerings
  FOR ALL TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));

-- vocabulários
DROP POLICY IF EXISTS "Vocabulário de materiais é público" ON public.materials;
CREATE POLICY "Vocabulário de materiais é público" ON public.materials FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Vocabulário de estilos é público" ON public.styles;
CREATE POLICY "Vocabulário de estilos é público" ON public.styles FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Vocabulário de técnicas é público" ON public.techniques;
CREATE POLICY "Vocabulário de técnicas é público" ON public.techniques FOR SELECT TO public USING (true);

-- categorias
DROP POLICY IF EXISTS "Categorias são públicas" ON public.categories;
CREATE POLICY "Categorias são públicas" ON public.categories FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Só admin gerencia categorias" ON public.categories;
CREATE POLICY "Só admin gerencia categorias" ON public.categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- produtos
DROP POLICY IF EXISTS "Produtos ativos são públicos" ON public.products;
CREATE POLICY "Produtos ativos são públicos" ON public.products
  FOR SELECT TO public USING (
    (status = ANY (ARRAY['active'::public.listing_status, 'sold_out'::public.listing_status])
      AND EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = products.artisan_id AND a.status = 'active'))
    OR public.owns_artisan(artisan_id) OR public.is_admin());
DROP POLICY IF EXISTS "Artesão cria produto na própria loja" ON public.products;
CREATE POLICY "Artesão cria produto na própria loja" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Artesão edita o próprio produto" ON public.products;
CREATE POLICY "Artesão edita o próprio produto" ON public.products
  FOR UPDATE TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Artesão remove o próprio produto" ON public.products;
CREATE POLICY "Artesão remove o próprio produto" ON public.products
  FOR DELETE TO authenticated USING (public.owns_artisan(artisan_id));

-- imagens de produto
DROP POLICY IF EXISTS "Imagens seguem a visibilidade do produto" ON public.product_images;
CREATE POLICY "Imagens seguem a visibilidade do produto" ON public.product_images
  FOR SELECT TO public USING (EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND (
      (p.status = ANY (ARRAY['active'::public.listing_status, 'sold_out'::public.listing_status])
        AND EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = p.artisan_id AND a.status = 'active'))
      OR public.owns_artisan(p.artisan_id) OR public.is_admin())));
DROP POLICY IF EXISTS "Artesão gerencia as imagens dos próprios produtos" ON public.product_images;
CREATE POLICY "Artesão gerencia as imagens dos próprios produtos" ON public.product_images
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND public.owns_artisan(p.artisan_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND public.owns_artisan(p.artisan_id)));

-- experiências
DROP POLICY IF EXISTS "Experiências ativas são públicas" ON public.experiences;
CREATE POLICY "Experiências ativas são públicas" ON public.experiences
  FOR SELECT TO public USING (
    (status = ANY (ARRAY['active'::public.listing_status, 'sold_out'::public.listing_status])
      AND EXISTS (SELECT 1 FROM public.artisans a WHERE a.id = experiences.artisan_id AND a.status = 'active'))
    OR public.owns_artisan(artisan_id) OR public.is_admin());
DROP POLICY IF EXISTS "Artesão cria experiência na própria loja" ON public.experiences;
CREATE POLICY "Artesão cria experiência na própria loja" ON public.experiences
  FOR INSERT TO authenticated WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Artesão edita a própria experiência" ON public.experiences;
CREATE POLICY "Artesão edita a própria experiência" ON public.experiences
  FOR UPDATE TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Artesão remove a própria experiência" ON public.experiences;
CREATE POLICY "Artesão remove a própria experiência" ON public.experiences
  FOR DELETE TO authenticated USING (public.owns_artisan(artisan_id));

-- pedidos
DROP POLICY IF EXISTS "Comprador e artesão envolvido veem o pedido" ON public.orders;
CREATE POLICY "Comprador e artesão envolvido veem o pedido" ON public.orders
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid() OR public.pedido_tem_item_meu(id) OR public.is_admin());
DROP POLICY IF EXISTS "Comprador cria o próprio pedido" ON public.orders;
CREATE POLICY "Comprador cria o próprio pedido" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (buyer_user_id = auth.uid() AND status = 'pending'::public.order_status);
DROP POLICY IF EXISTS "Artesão atualiza pedido em que tem item" ON public.orders;
CREATE POLICY "Artesão atualiza pedido em que tem item" ON public.orders
  FOR UPDATE TO authenticated USING (public.pedido_tem_item_meu(id)) WITH CHECK (public.pedido_tem_item_meu(id));
DROP POLICY IF EXISTS "Admin atualiza qualquer pedido" ON public.orders;
CREATE POLICY "Admin atualiza qualquer pedido" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- itens do pedido: ninguém insere direto; só criar_pedido() cria.
DROP POLICY IF EXISTS "Itens seguem a visibilidade do pedido" ON public.order_items;
CREATE POLICY "Itens seguem a visibilidade do pedido" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.buyer_user_id = auth.uid())
    OR public.owns_artisan(artisan_id) OR public.is_admin());
DROP POLICY IF EXISTS "Ninguém insere item direto" ON public.order_items;
CREATE POLICY "Ninguém insere item direto" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (false);

-- eventos de pagamento
DROP POLICY IF EXISTS "Só admin lê eventos de pagamento" ON public.pagarme_events;
CREATE POLICY "Só admin lê eventos de pagamento" ON public.pagarme_events
  FOR SELECT TO authenticated USING (public.is_admin());

-- configuração da plataforma
DROP POLICY IF EXISTS "Configuração é legível por todos" ON public.platform_settings;
CREATE POLICY "Configuração é legível por todos" ON public.platform_settings FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Só admin altera a configuração" ON public.platform_settings;
CREATE POLICY "Só admin altera a configuração" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- favoritos
DROP POLICY IF EXISTS "Cada um enxerga os próprios favoritos" ON public.favorites;
CREATE POLICY "Cada um enxerga os próprios favoritos" ON public.favorites
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Cada um gerencia os próprios favoritos" ON public.favorites;
CREATE POLICY "Cada um gerencia os próprios favoritos" ON public.favorites
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- conversas e mensagens
DROP POLICY IF EXISTS "Participantes veem a conversa" ON public.conversations;
CREATE POLICY "Participantes veem a conversa" ON public.conversations
  FOR SELECT TO authenticated USING (buyer_user_id = auth.uid() OR public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Comprador abre conversa" ON public.conversations;
CREATE POLICY "Comprador abre conversa" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (buyer_user_id = auth.uid());
DROP POLICY IF EXISTS "Participantes leem as mensagens" ON public.messages;
CREATE POLICY "Participantes leem as mensagens" ON public.messages
  FOR SELECT TO authenticated USING (public.participa_da_conversa(conversation_id));
DROP POLICY IF EXISTS "Participantes enviam mensagem" ON public.messages;
CREATE POLICY "Participantes enviam mensagem" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND public.participa_da_conversa(conversation_id));
DROP POLICY IF EXISTS "Participantes marcam como lida" ON public.messages;
CREATE POLICY "Participantes marcam como lida" ON public.messages
  FOR UPDATE TO authenticated USING (public.participa_da_conversa(conversation_id)) WITH CHECK (public.participa_da_conversa(conversation_id));

-- encomendas sob medida
DROP POLICY IF EXISTS "Comprador vê as próprias encomendas" ON public.custom_requests;
CREATE POLICY "Comprador vê as próprias encomendas" ON public.custom_requests
  FOR SELECT TO authenticated USING (
    buyer_user_id = auth.uid()
    OR (status <> 'rascunho'::public.request_status AND public.encomenda_e_minha(id))
    OR public.is_admin());
DROP POLICY IF EXISTS "Comprador cria a própria encomenda" ON public.custom_requests;
CREATE POLICY "Comprador cria a própria encomenda" ON public.custom_requests
  FOR INSERT TO authenticated WITH CHECK (buyer_user_id = auth.uid() AND status = 'rascunho'::public.request_status);
DROP POLICY IF EXISTS "Comprador edita a própria encomenda" ON public.custom_requests;
CREATE POLICY "Comprador edita a própria encomenda" ON public.custom_requests
  FOR UPDATE TO authenticated USING (buyer_user_id = auth.uid()) WITH CHECK (buyer_user_id = auth.uid());
DROP POLICY IF EXISTS "Comprador apaga o próprio rascunho" ON public.custom_requests;
CREATE POLICY "Comprador apaga o próprio rascunho" ON public.custom_requests
  FOR DELETE TO authenticated USING (buyer_user_id = auth.uid() AND status = 'rascunho'::public.request_status);

DROP POLICY IF EXISTS "Itens seguem a encomenda" ON public.custom_request_items;
CREATE POLICY "Itens seguem a encomenda" ON public.custom_request_items
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_items.request_id
      AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id) OR public.is_admin())));
DROP POLICY IF EXISTS "Comprador gerencia os itens da própria encomenda" ON public.custom_request_items;
CREATE POLICY "Comprador gerencia os itens da própria encomenda" ON public.custom_request_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_items.request_id AND r.buyer_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_items.request_id AND r.buyer_user_id = auth.uid()));

DROP POLICY IF EXISTS "Anexos seguem a encomenda" ON public.custom_request_attachments;
CREATE POLICY "Anexos seguem a encomenda" ON public.custom_request_attachments
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_attachments.request_id
      AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id) OR public.is_admin())));
DROP POLICY IF EXISTS "Participantes enviam anexo" ON public.custom_request_attachments;
CREATE POLICY "Participantes enviam anexo" ON public.custom_request_attachments
  FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_attachments.request_id
      AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id))));
DROP POLICY IF EXISTS "Quem enviou pode remover o próprio anexo" ON public.custom_request_attachments;
CREATE POLICY "Quem enviou pode remover o próprio anexo" ON public.custom_request_attachments
  FOR DELETE TO authenticated USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Artesão e comprador veem a distribuição" ON public.custom_request_matches;
CREATE POLICY "Artesão e comprador veem a distribuição" ON public.custom_request_matches
  FOR SELECT TO authenticated USING (
    public.owns_artisan(artisan_id)
    OR EXISTS (SELECT 1 FROM public.custom_requests r WHERE r.id = custom_request_matches.request_id AND r.buyer_user_id = auth.uid())
    OR public.is_admin());
DROP POLICY IF EXISTS "Artesão responde à própria distribuição" ON public.custom_request_matches;
CREATE POLICY "Artesão responde à própria distribuição" ON public.custom_request_matches
  FOR UPDATE TO authenticated USING (public.owns_artisan(artisan_id)) WITH CHECK (public.owns_artisan(artisan_id));
DROP POLICY IF EXISTS "Ninguém insere distribuição direto" ON public.custom_request_matches;
CREATE POLICY "Ninguém insere distribuição direto" ON public.custom_request_matches
  FOR INSERT TO authenticated WITH CHECK (false);

-- avaliações: só quem comprou E recebeu avalia.
DROP POLICY IF EXISTS "Avaliações são públicas" ON public.reviews;
CREATE POLICY "Avaliações são públicas" ON public.reviews FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Só quem comprou e recebeu avalia" ON public.reviews;
CREATE POLICY "Só quem comprou e recebeu avalia" ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND public.pode_avaliar(order_item_id));
DROP POLICY IF EXISTS "Autor edita a própria avaliação" ON public.reviews;
CREATE POLICY "Autor edita a própria avaliação" ON public.reviews
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "Artesão responde avaliação da própria loja" ON public.reviews;
CREATE POLICY "Artesão responde avaliação da própria loja" ON public.reviews
  FOR UPDATE TO authenticated USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id) AND public.avaliacao_apenas_resposta(id, rating, comment, author_id, order_item_id, artisan_id, product_id, experience_id));
DROP POLICY IF EXISTS "Autor apaga a própria avaliação" ON public.reviews;
CREATE POLICY "Autor apaga a própria avaliação" ON public.reviews
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.is_admin());

-- reviews_legacy (tabela antiga, mantida por compatibilidade)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews_legacy;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews_legacy FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews_legacy;
CREATE POLICY "Authenticated users can insert reviews" ON public.reviews_legacy
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL AND artisan_user_id <> auth.uid());
DROP POLICY IF EXISTS "Artisans can delete reviews on their profile" ON public.reviews_legacy;
CREATE POLICY "Artisans can delete reviews on their profile" ON public.reviews_legacy
  FOR DELETE TO authenticated USING (auth.uid() = artisan_user_id);

-- ---------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
