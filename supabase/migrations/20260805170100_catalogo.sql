-- =====================================================================
-- 2/5 — Catálogo: produtos, imagens, experiências e favoritos
--
-- Valores sempre em centavos (INTEGER). Dinheiro em float é fonte
-- garantida de divergência de centavo no split.
-- =====================================================================

CREATE TYPE public.stock_mode AS ENUM ('unique', 'quantity');
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'sold_out', 'archived');

-- ---------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------
CREATE TABLE public.products (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id             UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  category_id            UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  slug                   TEXT NOT NULL UNIQUE
                           CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title                  TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description            TEXT,
  price_cents            INTEGER NOT NULL CHECK (price_cents > 0),
  compare_at_price_cents INTEGER CHECK (compare_at_price_cents > price_cents),

  -- 'unique'   → peça única: some do ar assim que vende
  -- 'quantity' → estoque contado
  stock_mode             public.stock_mode NOT NULL DEFAULT 'unique',
  stock_quantity         INTEGER NOT NULL DEFAULT 1 CHECK (stock_quantity >= 0),

  status                 public.listing_status NOT NULL DEFAULT 'draft',
  featured               BOOLEAN NOT NULL DEFAULT FALSE,
  -- peso e dimensões para cálculo de frete mais adiante
  weight_grams           INTEGER CHECK (weight_grams > 0),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT peca_unica_tem_no_maximo_uma_unidade
    CHECK (stock_mode <> 'unique' OR stock_quantity <= 1)
);

CREATE INDEX products_artisan_idx  ON public.products (artisan_id);
CREATE INDEX products_category_idx ON public.products (category_id);
CREATE INDEX products_vitrine_idx  ON public.products (created_at DESC)
  WHERE status = 'active';

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Rascunho e arquivado não vazam: só o dono (e admin) enxerga.
CREATE POLICY "Produtos ativos são públicos"
  ON public.products FOR SELECT
  USING (
    (status IN ('active', 'sold_out') AND EXISTS (
      SELECT 1 FROM public.artisans a
      WHERE a.id = artisan_id AND a.status = 'active'
    ))
    OR public.owns_artisan(artisan_id)
    OR public.is_admin()
  );

CREATE POLICY "Artesão cria produto na própria loja"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Artesão edita o próprio produto"
  ON public.products FOR UPDATE TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Artesão remove o próprio produto"
  ON public.products FOR DELETE TO authenticated
  USING (public.owns_artisan(artisan_id));

-- ---------------------------------------------------------------------
-- Imagens do produto
--
-- `tint` guarda a cor média da foto: é o placeholder que a grade usa
-- enquanto a imagem carrega (ver ImagemComPlaceholder no front).
-- ---------------------------------------------------------------------
CREATE TABLE public.product_images (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt          TEXT,
  tint         TEXT CHECK (tint ~ '^#[0-9A-Fa-f]{6}$'),
  width        INTEGER,
  height       INTEGER,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_idx ON public.product_images (product_id, position);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Imagens seguem a visibilidade do produto"
  ON public.product_images FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id));

CREATE POLICY "Artesão gerencia as imagens dos próprios produtos"
  ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND public.owns_artisan(p.artisan_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id AND public.owns_artisan(p.artisan_id)
  ));

-- ---------------------------------------------------------------------
-- Experiências (aulas, vivências, mentorias)
-- ---------------------------------------------------------------------
CREATE TYPE public.experience_kind AS ENUM ('live', 'recorded', 'in_person', 'mentorship');

CREATE TABLE public.experiences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id       UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  slug             TEXT NOT NULL UNIQUE
                     CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description      TEXT,
  kind             public.experience_kind NOT NULL,
  price_cents      INTEGER NOT NULL CHECK (price_cents > 0),
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  -- 'recorded' não tem data nem vaga; os demais têm
  starts_at        TIMESTAMPTZ,
  capacity         INTEGER CHECK (capacity > 0),
  seats_taken      INTEGER NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
  location         TEXT,
  cover_path       TEXT,
  cover_tint       TEXT CHECK (cover_tint ~ '^#[0-9A-Fa-f]{6}$'),
  status           public.listing_status NOT NULL DEFAULT 'draft',
  featured         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT experiencia_gravada_nao_tem_agenda
    CHECK (kind <> 'recorded' OR (starts_at IS NULL AND capacity IS NULL)),
  CONSTRAINT experiencia_ao_vivo_tem_data
    CHECK (kind = 'recorded' OR starts_at IS NOT NULL),
  CONSTRAINT vagas_nao_excedem_capacidade
    CHECK (capacity IS NULL OR seats_taken <= capacity)
);

CREATE INDEX experiences_artisan_idx ON public.experiences (artisan_id);
CREATE INDEX experiences_agenda_idx  ON public.experiences (starts_at)
  WHERE status = 'active';

CREATE TRIGGER experiences_updated_at
  BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experiências ativas são públicas"
  ON public.experiences FOR SELECT
  USING (
    (status IN ('active', 'sold_out') AND EXISTS (
      SELECT 1 FROM public.artisans a
      WHERE a.id = artisan_id AND a.status = 'active'
    ))
    OR public.owns_artisan(artisan_id)
    OR public.is_admin()
  );

CREATE POLICY "Artesão cria experiência na própria loja"
  ON public.experiences FOR INSERT TO authenticated
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Artesão edita a própria experiência"
  ON public.experiences FOR UPDATE TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Artesão remove a própria experiência"
  ON public.experiences FOR DELETE TO authenticated
  USING (public.owns_artisan(artisan_id));

-- ---------------------------------------------------------------------
-- Favoritos
-- ---------------------------------------------------------------------
CREATE TABLE public.favorites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cada um enxerga os próprios favoritos"
  ON public.favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Cada um gerencia os próprios favoritos"
  ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
