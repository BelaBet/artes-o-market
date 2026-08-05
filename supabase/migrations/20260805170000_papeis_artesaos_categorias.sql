-- =====================================================================
-- 1/5 — Papéis, artesãos, categorias e configuração da plataforma
-- =====================================================================

-- ---------------------------------------------------------------------
-- Papéis
--
-- Papel NÃO pode viver em `profiles`: a policy existente permite que a
-- pessoa atualize a própria linha, o que viraria escalada de privilégio
-- (qualquer comprador se promovendo a admin com um UPDATE).
-- ---------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('buyer', 'artisan', 'admin');

CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: consultada dentro de policies, precisa enxergar a
-- tabela sem recursão de RLS.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin');
$$;

-- Ninguém escreve em user_roles pela API: só leitura do próprio papel.
-- Promoção a artesão acontece via função controlada (abaixo); promoção a
-- admin é manual, pelo painel do Supabase.
CREATE POLICY "Cada um vê os próprios papéis"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------------------
-- Configuração da plataforma (comissão padrão)
-- ---------------------------------------------------------------------
CREATE TABLE public.platform_settings (
  id                     BOOLEAN PRIMARY KEY DEFAULT TRUE,
  -- em basis points: 1200 = 12%
  default_commission_bps INTEGER NOT NULL DEFAULT 1200
    CHECK (default_commission_bps BETWEEN 0 AND 10000),
  support_email          TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- garante uma única linha
  CONSTRAINT platform_settings_linha_unica CHECK (id)
);

INSERT INTO public.platform_settings (id) VALUES (TRUE);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuração é legível por todos"
  ON public.platform_settings FOR SELECT USING (TRUE);

CREATE POLICY "Só admin altera a configuração"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- Artesãos (a loja)
--
-- Separado de `profiles`: profile é a pessoa, artisan é a loja. Um dia
-- pode haver loja com mais de um responsável sem remodelar tudo.
-- ---------------------------------------------------------------------
CREATE TABLE public.artisans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug                 TEXT NOT NULL UNIQUE
                         CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  shop_name            TEXT NOT NULL,
  headline             TEXT,
  bio                  TEXT,
  city                 TEXT,
  state                CHAR(2),
  avatar_url           TEXT,
  cover_url            TEXT,
  whatsapp             TEXT,
  instagram            TEXT,
  verified             BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active', 'suspended')),
  -- Pagar.me: recebedor do split. Nulo até o onboarding financeiro.
  pagarme_recipient_id TEXT,
  -- Sobrescreve a comissão padrão da plataforma quando preenchido.
  commission_bps       INTEGER CHECK (commission_bps BETWEEN 0 AND 10000),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX artisans_status_idx ON public.artisans (status) WHERE status = 'active';

ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;

-- Helper reutilizado nas policies de produtos, experiências e pedidos.
CREATE OR REPLACE FUNCTION public.owns_artisan(_artisan_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.artisans
    WHERE id = _artisan_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.my_artisan_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.artisans WHERE user_id = auth.uid();
$$;

CREATE POLICY "Lojas ativas são públicas"
  ON public.artisans FOR SELECT
  USING (status = 'active' OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Artesão edita a própria loja"
  ON public.artisans FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin edita qualquer loja"
  ON public.artisans FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- INSERT não é liberado direto: passa pela função abaixo, que controla
-- os campos que o artesão não pode definir por conta própria
-- (verified, status, commission_bps, pagarme_recipient_id).
CREATE OR REPLACE FUNCTION public.criar_minha_loja(
  _shop_name TEXT,
  _slug      TEXT,
  _city      TEXT DEFAULT NULL,
  _state     CHAR(2) DEFAULT NULL,
  _bio       TEXT DEFAULT NULL
)
RETURNS public.artisans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nova public.artisans;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É preciso estar autenticado';
  END IF;

  INSERT INTO public.artisans (user_id, shop_name, slug, city, state, bio)
  VALUES (auth.uid(), _shop_name, lower(_slug), _city, _state, _bio)
  RETURNING * INTO _nova;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'artisan')
  ON CONFLICT DO NOTHING;

  RETURN _nova;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_minha_loja(TEXT, TEXT, TEXT, CHAR, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.criar_minha_loja(TEXT, TEXT, TEXT, CHAR, TEXT) TO authenticated;

CREATE TRIGGER artisans_updated_at
  BEFORE UPDATE ON public.artisans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------
CREATE TABLE public.categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE
               CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categorias são públicas"
  ON public.categories FOR SELECT USING (TRUE);

CREATE POLICY "Só admin gerencia categorias"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.categories (slug, name, position) VALUES
  ('pedra-sabao', 'Pedra-Sabão', 1),
  ('macrame',     'Macramê',     2),
  ('madeira',     'Madeira',     3),
  ('palha',       'Palha',       4),
  ('ceramica',    'Cerâmica',    5),
  ('barro',       'Barro',       6),
  ('cestos',      'Cestos',      7),
  ('tecidos',     'Tecidos',     8);

-- ---------------------------------------------------------------------
-- Papel de comprador para quem já existe e para novos cadastros
-- ---------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'buyer' FROM auth.users
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.is_admin()          TO authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.owns_artisan(UUID)  TO authenticated;
GRANT  EXECUTE ON FUNCTION public.my_artisan_id()     TO authenticated;
