-- =====================================================================
-- 7 — Perfil estendido do artesão, vocabulários e progresso da loja
--
-- Estende `artisans` em vez de criar `artisan_profiles`: a loja já é
-- essa tabela, e é para ela que apontam as policies, os produtos, as
-- experiências e o Storage. Uma segunda tabela de perfil significaria
-- dois lugares para a mesma verdade.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Campos novos
-- ---------------------------------------------------------------------
ALTER TABLE public.artisans
  ADD COLUMN IF NOT EXISTS public_name              TEXT,
  ADD COLUMN IF NOT EXISTS logo_url                 TEXT,
  ADD COLUMN IF NOT EXISTS workshop_image_url       TEXT,
  ADD COLUMN IF NOT EXISTS working_image_url        TEXT,
  ADD COLUMN IF NOT EXISTS facebook                 TEXT,
  ADD COLUMN IF NOT EXISTS website                  TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience      INTEGER CHECK (years_of_experience BETWEEN 0 AND 90),
  ADD COLUMN IF NOT EXISTS production_capacity_monthly INTEGER CHECK (production_capacity_monthly >= 0),
  ADD COLUMN IF NOT EXISTS average_production_days  INTEGER CHECK (average_production_days >= 0),
  ADD COLUMN IF NOT EXISTS minimum_order_days       INTEGER CHECK (minimum_order_days >= 0),
  ADD COLUMN IF NOT EXISTS team_size                INTEGER CHECK (team_size >= 0),
  ADD COLUMN IF NOT EXISTS accepts_custom_orders    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_large_orders     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ships_nationwide         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_ready_stock          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sells_to_people          BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sells_to_companies       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sells_to_stores          BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sells_to_architects      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS receives_visitors        BOOLEAN NOT NULL DEFAULT FALSE,
  -- Onde o onboarding parou. Nulo = ainda não começou.
  ADD COLUMN IF NOT EXISTS onboarding_step          TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_started_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_skipped_at    TIMESTAMPTZ;

COMMENT ON COLUMN public.artisans.public_name IS
  'Nome que aparece para o comprador. Cai para shop_name quando vazio.';

-- Telefone e endereço não podem virar públicos por descuido.
ALTER TABLE public.artisans
  ADD COLUMN IF NOT EXISTS whatsapp_publico BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.artisans.whatsapp IS
  'Só aparece na loja quando whatsapp_publico = true.';

-- ---------------------------------------------------------------------
-- Vocabulários: materiais, técnicas, estilos
--
-- Tabelas em vez de texto livre para que a busca por "quem trabalha com
-- barro" funcione sem depender de o artesão ter escrito igual.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.materials (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.techniques (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.styles (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.materials (slug, name, position) VALUES
  ('barro','Barro',1), ('ceramica','Cerâmica',2), ('madeira','Madeira',3),
  ('renda','Renda',4), ('croche','Crochê',5), ('bordado','Bordado',6),
  ('palha','Palha',7), ('fibras-naturais','Fibras naturais',8),
  ('couro','Couro',9), ('pintura','Pintura',10), ('tecidos','Tecidos',11),
  ('papel','Papel',12), ('metal','Metal',13), ('vidro','Vidro',14),
  ('joias-acessorios','Joias e acessórios',15), ('outros','Outros',99)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.techniques (slug, name, position) VALUES
  ('feito-a-mao','Feito totalmente à mão',1),
  ('producao-individual','Produção individual',2),
  ('producao-familiar','Produção em família',3),
  ('pequena-equipe','Pequena equipe',4),
  ('tecnica-tradicional','Técnica tradicional',5),
  ('tecnica-propria','Técnica própria',6),
  ('sob-encomenda','Produção sob encomenda',7),
  ('materiais-reaproveitados','Materiais reaproveitados',8),
  ('producao-sustentavel','Produção sustentável',9)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.styles (slug, name, position) VALUES
  ('tradicional','Tradicional',1), ('nordestino','Nordestino',2),
  ('rustico','Rústico',3), ('moderno','Moderno',4),
  ('contemporaneo','Contemporâneo',5), ('colorido','Colorido',6),
  ('minimalista','Minimalista',7), ('religioso','Religioso',8),
  ('decorativo','Decorativo',9), ('utilitario','Utilitário',10),
  ('infantil','Infantil',11), ('sustentavel','Sustentável',12),
  ('regional','Regional',13), ('exclusivo','Exclusivo',14),
  ('personalizado','Personalizado',15)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- Ligações artesão ↔ vocabulário
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.artisan_materials (
  artisan_id  UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  outro       TEXT,
  PRIMARY KEY (artisan_id, material_id)
);

CREATE TABLE IF NOT EXISTS public.artisan_techniques (
  artisan_id   UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.techniques(id) ON DELETE CASCADE,
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (artisan_id, technique_id)
);

CREATE TABLE IF NOT EXISTS public.artisan_styles (
  artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  style_id   UUID NOT NULL REFERENCES public.styles(id) ON DELETE CASCADE,
  PRIMARY KEY (artisan_id, style_id)
);

-- ---------------------------------------------------------------------
-- O que o artesão oferece
-- ---------------------------------------------------------------------
CREATE TYPE public.offering_type AS ENUM (
  'product', 'custom_order', 'class', 'workshop', 'course',
  'studio_visit', 'cultural_experience', 'lecture', 'event',
  'corporate', 'stores', 'hotels', 'architects', 'corporate_gifts',
  'school', 'undecided'
);

CREATE TABLE IF NOT EXISTS public.artisan_offerings (
  artisan_id    UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  offering_type public.offering_type NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (artisan_id, offering_type)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.materials          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.techniques         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.styles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_materials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_styles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_offerings  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vocabulário de materiais é público"
  ON public.materials FOR SELECT USING (TRUE);
CREATE POLICY "Vocabulário de técnicas é público"
  ON public.techniques FOR SELECT USING (TRUE);
CREATE POLICY "Vocabulário de estilos é público"
  ON public.styles FOR SELECT USING (TRUE);

CREATE POLICY "Materiais da loja são públicos"
  ON public.artisan_materials FOR SELECT USING (TRUE);
CREATE POLICY "Artesão gerencia os próprios materiais"
  ON public.artisan_materials FOR ALL TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Técnicas da loja são públicas"
  ON public.artisan_techniques FOR SELECT USING (TRUE);
CREATE POLICY "Artesão gerencia as próprias técnicas"
  ON public.artisan_techniques FOR ALL TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Estilos da loja são públicos"
  ON public.artisan_styles FOR SELECT USING (TRUE);
CREATE POLICY "Artesão gerencia os próprios estilos"
  ON public.artisan_styles FOR ALL TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

CREATE POLICY "Ofertas da loja são públicas"
  ON public.artisan_offerings FOR SELECT USING (TRUE);
CREATE POLICY "Artesão gerencia as próprias ofertas"
  ON public.artisan_offerings FOR ALL TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

-- ---------------------------------------------------------------------
-- Criação da loja no primeiro acesso
--
-- O artesão não deveria ter que inventar um "slug". A função deriva do
-- nome e resolve colisão sozinha.
-- ---------------------------------------------------------------------
-- unaccent exigiria extensão; a troca manual cobre o português.
CREATE OR REPLACE FUNCTION public.unaccent_simples(_texto TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT translate(
    _texto,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

CREATE OR REPLACE FUNCTION public.gerar_slug(_texto TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(public.unaccent_simples(_texto)),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.garantir_minha_loja(_shop_name TEXT DEFAULT NULL)
RETURNS public.artisans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loja  public.artisans;
  _base  TEXT;
  _slug  TEXT;
  _n     INTEGER := 1;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É preciso estar autenticado';
  END IF;

  SELECT * INTO _loja FROM public.artisans WHERE user_id = auth.uid();
  IF FOUND THEN
    RETURN _loja;
  END IF;

  _base := NULLIF(public.gerar_slug(COALESCE(_shop_name, 'atelie')), '');
  _base := COALESCE(_base, 'atelie');
  _slug := _base;

  WHILE EXISTS (SELECT 1 FROM public.artisans WHERE slug = _slug) LOOP
    _n := _n + 1;
    _slug := _base || '-' || _n;
  END LOOP;

  INSERT INTO public.artisans (user_id, shop_name, slug, status)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_shop_name), ''), 'Meu Ateliê'), _slug, 'pending')
  RETURNING * INTO _loja;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'artisan')
  ON CONFLICT DO NOTHING;

  RETURN _loja;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.garantir_minha_loja(TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.garantir_minha_loja(TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- Progresso da loja
--
-- Calculado, não guardado: coluna `profile_completion` ficaria
-- desatualizada a cada edição feita por fora do painel.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.progresso_da_loja(_artisan_id UUID)
RETURNS TABLE (etapa TEXT, rotulo TEXT, concluida BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'conta'      AS etapa, 'Conta criada'                  AS rotulo, TRUE AS concluida
    UNION ALL SELECT 'nome',      'Nome da loja informado',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id
              AND shop_name IS NOT NULL AND shop_name <> 'Meu Ateliê')
    UNION ALL SELECT 'cidade',    'Cidade adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND city IS NOT NULL)
    UNION ALL SELECT 'historia',  'História adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id
              AND length(coalesce(bio, '')) >= 40)
    UNION ALL SELECT 'materiais', 'Materiais informados',
      EXISTS (SELECT 1 FROM artisan_materials WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'tecnicas',  'Técnicas informadas',
      EXISTS (SELECT 1 FROM artisan_techniques WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'foto',      'Foto adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND avatar_url IS NOT NULL)
    UNION ALL SELECT 'atelie',    'Foto do ateliê adicionada',
      EXISTS (SELECT 1 FROM artisans WHERE id = _artisan_id AND workshop_image_url IS NOT NULL)
    UNION ALL SELECT 'vendas',    'Formas de venda informadas',
      EXISTS (SELECT 1 FROM artisan_offerings WHERE artisan_id = _artisan_id)
    UNION ALL SELECT 'peca',      'Primeira peça publicada',
      EXISTS (SELECT 1 FROM products WHERE artisan_id = _artisan_id AND status = 'active')
    UNION ALL SELECT 'experiencia','Primeira experiência publicada',
      EXISTS (SELECT 1 FROM experiences WHERE artisan_id = _artisan_id AND status = 'active')
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.progresso_da_loja(UUID) TO authenticated;
