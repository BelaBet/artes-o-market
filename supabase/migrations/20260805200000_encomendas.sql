-- =====================================================================
-- 8 — Projetos Sob Medida (encomendas)
--
-- Reaproveita o que já existe:
--   - a conversa é `conversations` + `messages`, com request_id novo;
--     não há um segundo sistema de mensagens
--   - o pagamento, quando a proposta for aceita (Etapa 2), vira pedido
--     em `orders` + `order_items`, com o split que já funciona
--   - a compatibilidade sai de artisan_materials/techniques e dos campos
--     de capacidade que a migration 7 criou
-- =====================================================================

CREATE TYPE public.request_type AS ENUM (
  'personalizar',    -- versão diferente de uma peça existente
  'peca_nova',       -- só uma ideia
  'quantidade',      -- produção em série
  'brindes',
  'evento',
  'decoracao',
  'loja',
  'hotelaria',
  'arquitetura',
  'outro'
);

CREATE TYPE public.request_status AS ENUM (
  'rascunho',
  'enviada',
  'em_distribuicao',
  'recebendo_propostas',
  'em_negociacao',
  'proposta_escolhida',
  'aguardando_pagamento',
  'confirmada',
  'em_producao',
  'pronta_para_envio',
  'enviada_ao_cliente',
  'entregue',
  'concluida',
  'cancelada',
  'expirada'
);

CREATE TYPE public.distribution_mode AS ENUM (
  'artesao_especifico',
  'recomendados',
  'aberta'
);

CREATE TYPE public.match_response AS ENUM (
  'pendente',
  'visualizada',
  'interessado',
  'mais_informacoes',
  'recusada',
  'proposta_enviada'
);

-- ---------------------------------------------------------------------
-- A solicitação
-- ---------------------------------------------------------------------
CREATE TABLE public.custom_requests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number               BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 100),
  buyer_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type         public.request_type NOT NULL,
  -- quando nasce a partir de uma peça da vitrine
  source_product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  selected_artisan_id  UUID REFERENCES public.artisans(id) ON DELETE SET NULL,

  title                TEXT,
  description          TEXT,
  intended_use         TEXT,

  -- faixa em vez de número exato: o comprador raramente sabe o valor
  quantity_min         INTEGER CHECK (quantity_min > 0),
  quantity_max         INTEGER CHECK (quantity_max > 0),
  budget_min_cents     INTEGER CHECK (budget_min_cents >= 0),
  budget_max_cents     INTEGER CHECK (budget_max_cents >= 0),

  desired_date         DATE,
  desired_period       TEXT,

  delivery_postal_code TEXT,
  delivery_city        TEXT,
  delivery_state       CHAR(2),

  -- detalhes livres de personalização (cor, tamanho, acabamento…)
  customizations       JSONB NOT NULL DEFAULT '{}'::JSONB,

  distribution_mode    public.distribution_mode NOT NULL DEFAULT 'recomendados',
  max_proposals        INTEGER NOT NULL DEFAULT 3 CHECK (max_proposals BETWEEN 1 AND 10),

  status               public.request_status NOT NULL DEFAULT 'rascunho',
  published_at         TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT faixa_de_quantidade_coerente
    CHECK (quantity_max IS NULL OR quantity_min IS NULL OR quantity_max >= quantity_min),
  CONSTRAINT faixa_de_orcamento_coerente
    CHECK (budget_max_cents IS NULL OR budget_min_cents IS NULL OR budget_max_cents >= budget_min_cents),
  CONSTRAINT artesao_especifico_tem_artesao
    CHECK (distribution_mode <> 'artesao_especifico' OR selected_artisan_id IS NOT NULL)
);

CREATE INDEX custom_requests_buyer_idx  ON public.custom_requests (buyer_user_id, created_at DESC);
CREATE INDEX custom_requests_status_idx ON public.custom_requests (status);

CREATE TRIGGER custom_requests_updated_at
  BEFORE UPDATE ON public.custom_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Itens (ambientes de um projeto)
-- ---------------------------------------------------------------------
CREATE TABLE public.custom_request_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  quantity    INTEGER CHECK (quantity > 0),
  dimensions  TEXT,
  notes       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX custom_request_items_idx ON public.custom_request_items (request_id, position);

-- ---------------------------------------------------------------------
-- Anexos
--
-- Bucket PRIVADO: planta de arquiteto, logo de empresa e foto da casa
-- do comprador não podem ficar em URL pública como as fotos da vitrine.
-- O acesso é por URL assinada, gerada só para quem participa.
-- ---------------------------------------------------------------------
CREATE TABLE public.custom_request_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX custom_request_attachments_idx ON public.custom_request_attachments (request_id);

-- ---------------------------------------------------------------------
-- Distribuição
-- ---------------------------------------------------------------------
CREATE TABLE public.custom_request_matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.custom_requests(id) ON DELETE CASCADE,
  artisan_id      UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  match_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  match_reasons   TEXT[] NOT NULL DEFAULT '{}',
  response_status public.match_response NOT NULL DEFAULT 'pendente',
  -- motivo da recusa fica com a plataforma, não vai para o comprador
  decline_reason  TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at       TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  UNIQUE (request_id, artisan_id)
);

CREATE INDEX custom_request_matches_artisan_idx
  ON public.custom_request_matches (artisan_id, response_status, sent_at DESC);

-- ---------------------------------------------------------------------
-- Conversa vinculada à encomenda (reaproveita conversations)
-- ---------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.custom_requests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS conversations_request_idx ON public.conversations (request_id);

-- O UNIQUE antigo (artisan, buyer, product) impediria duas conversas da
-- mesma dupla sobre encomendas diferentes.
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_artisan_id_buyer_user_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_unicidade
  ON public.conversations (
    artisan_id,
    buyer_user_id,
    COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(request_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.custom_requests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_request_matches      ENABLE ROW LEVEL SECURITY;

-- O artesão só enxerga encomenda que foi distribuída para ele. Função
-- SECURITY DEFINER para não criar recursão entre requests e matches.
CREATE OR REPLACE FUNCTION public.encomenda_e_minha(_request_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.custom_request_matches m
    JOIN public.artisans a ON a.id = m.artisan_id
    WHERE m.request_id = _request_id AND a.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.encomenda_e_minha(UUID) TO authenticated;

CREATE POLICY "Comprador vê as próprias encomendas"
  ON public.custom_requests FOR SELECT TO authenticated
  USING (
    buyer_user_id = auth.uid()
    -- rascunho nunca chega ao artesão
    OR (status <> 'rascunho' AND public.encomenda_e_minha(id))
    OR public.is_admin()
  );

CREATE POLICY "Comprador cria a própria encomenda"
  ON public.custom_requests FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid() AND status = 'rascunho');

CREATE POLICY "Comprador edita a própria encomenda"
  ON public.custom_requests FOR UPDATE TO authenticated
  USING (buyer_user_id = auth.uid())
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Comprador apaga o próprio rascunho"
  ON public.custom_requests FOR DELETE TO authenticated
  USING (buyer_user_id = auth.uid() AND status = 'rascunho');

CREATE POLICY "Itens seguem a encomenda"
  ON public.custom_request_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_requests r WHERE r.id = request_id));

CREATE POLICY "Comprador gerencia os itens da própria encomenda"
  ON public.custom_request_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_requests r
    WHERE r.id = request_id AND r.buyer_user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.custom_requests r
    WHERE r.id = request_id AND r.buyer_user_id = auth.uid()
  ));

CREATE POLICY "Anexos seguem a encomenda"
  ON public.custom_request_attachments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_requests r WHERE r.id = request_id));

CREATE POLICY "Participantes enviam anexo"
  ON public.custom_request_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.custom_requests r
      WHERE r.id = request_id
        AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id))
    )
  );

CREATE POLICY "Quem enviou pode remover o próprio anexo"
  ON public.custom_request_attachments FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Matches: o artesão vê os dele; o comprador vê os da encomenda dele,
-- mas o motivo da recusa é filtrado na leitura (coluna revogada abaixo).
CREATE POLICY "Artesão e comprador veem a distribuição"
  ON public.custom_request_matches FOR SELECT TO authenticated
  USING (
    public.owns_artisan(artisan_id)
    OR EXISTS (
      SELECT 1 FROM public.custom_requests r
      WHERE r.id = request_id AND r.buyer_user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Artesão responde à própria distribuição"
  ON public.custom_request_matches FOR UPDATE TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

-- A distribuição é feita pelo servidor (função abaixo), nunca pelo cliente.
CREATE POLICY "Ninguém insere distribuição direto"
  ON public.custom_request_matches FOR INSERT TO authenticated
  WITH CHECK (FALSE);

REVOKE SELECT (decline_reason) ON public.custom_request_matches FROM authenticated;

-- =====================================================================
-- Distribuição: encontrar artesãos compatíveis
--
-- Pontuação simples e explicável. Nada de caixa-preta: `match_reasons`
-- guarda por que aquele artesão recebeu, para poder auditar depois.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.distribuir_encomenda(_request_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req      public.custom_requests;
  _inseridos INTEGER := 0;
BEGIN
  SELECT * INTO _req FROM public.custom_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encomenda não encontrada';
  END IF;

  IF _req.buyer_user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente quem criou a encomenda pode distribuí-la';
  END IF;

  -- Artesão escolhido a dedo: vai só para ele.
  IF _req.distribution_mode = 'artesao_especifico' THEN
    INSERT INTO public.custom_request_matches (request_id, artisan_id, match_score, match_reasons)
    VALUES (_request_id, _req.selected_artisan_id, 100, ARRAY['escolhido pelo comprador'])
    ON CONFLICT DO NOTHING;
    RETURN 1;
  END IF;

  WITH candidatos AS (
    SELECT
      a.id,
      (
        -- aceita encomenda: requisito, não bônus
        30
        + CASE WHEN _req.delivery_state IS NOT NULL AND a.state = _req.delivery_state THEN 20 ELSE 0 END
        + CASE WHEN _req.delivery_city  IS NOT NULL AND a.city  = _req.delivery_city  THEN 10 ELSE 0 END
        + CASE WHEN _req.quantity_min IS NOT NULL AND _req.quantity_min > 50
                 AND a.accepts_large_orders THEN 20 ELSE 0 END
        + CASE WHEN a.verified THEN 10 ELSE 0 END
        + CASE WHEN EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.artisan_id = a.id AND p.status = 'active'
          ) THEN 10 ELSE 0 END
        + COALESCE((
            SELECT LEAST(r.average_rating, 5) * 2
            FROM public.artisan_ratings r WHERE r.artisan_id = a.id
          ), 0)
      )::NUMERIC AS score,
      ARRAY_REMOVE(ARRAY[
        'aceita encomendas',
        CASE WHEN _req.delivery_state IS NOT NULL AND a.state = _req.delivery_state
             THEN 'mesmo estado' END,
        CASE WHEN _req.quantity_min IS NOT NULL AND _req.quantity_min > 50 AND a.accepts_large_orders
             THEN 'aceita grandes pedidos' END,
        CASE WHEN a.verified THEN 'loja verificada' END
      ], NULL) AS razoes
    FROM public.artisans a
    WHERE a.status = 'active'
      AND a.accepts_custom_orders
      -- capacidade declarada compatível com a quantidade pedida
      AND (
        _req.quantity_min IS NULL
        OR a.production_capacity_monthly IS NULL
        OR a.production_capacity_monthly >= _req.quantity_min
      )
  )
  INSERT INTO public.custom_request_matches (request_id, artisan_id, match_score, match_reasons)
  SELECT _request_id, id, score, razoes
  FROM candidatos
  ORDER BY score DESC
  -- limite de propostas: evita transformar a encomenda em spam
  LIMIT _req.max_proposals
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _inseridos = ROW_COUNT;
  RETURN _inseridos;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.distribuir_encomenda(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.distribuir_encomenda(UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- Enviar a encomenda: publica e distribui numa transação só
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enviar_encomenda(_request_id UUID)
RETURNS public.custom_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req        public.custom_requests;
  _encontrados INTEGER;
BEGIN
  SELECT * INTO _req FROM public.custom_requests
  WHERE id = _request_id AND buyer_user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encomenda não encontrada';
  END IF;

  IF _req.status <> 'rascunho' THEN
    RAISE EXCEPTION 'Esta encomenda já foi enviada';
  END IF;

  IF COALESCE(length(trim(_req.description)), 0) < 10 THEN
    RAISE EXCEPTION 'Conte um pouco mais sobre o que você precisa antes de enviar';
  END IF;

  UPDATE public.custom_requests
  SET status       = 'em_distribuicao',
      published_at = now(),
      expires_at   = COALESCE(expires_at, now() + INTERVAL '30 days')
  WHERE id = _request_id
  RETURNING * INTO _req;

  _encontrados := public.distribuir_encomenda(_request_id);

  UPDATE public.custom_requests
  SET status = CASE WHEN _encontrados > 0 THEN 'recebendo_propostas'::public.request_status
                    ELSE 'em_distribuicao'::public.request_status END
  WHERE id = _request_id
  RETURNING * INTO _req;

  RETURN _req;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enviar_encomenda(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.enviar_encomenda(UUID) TO authenticated;

-- ---------------------------------------------------------------------
-- Resposta do artesão
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.responder_encomenda(
  _request_id UUID,
  _resposta   public.match_response,
  _motivo     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _artisan UUID;
BEGIN
  _artisan := public.my_artisan_id();
  IF _artisan IS NULL THEN
    RAISE EXCEPTION 'Somente artesãos respondem encomendas';
  END IF;

  UPDATE public.custom_request_matches
  SET response_status = _resposta,
      decline_reason  = CASE WHEN _resposta = 'recusada' THEN _motivo ELSE decline_reason END,
      responded_at    = now(),
      viewed_at       = COALESCE(viewed_at, now())
  WHERE request_id = _request_id AND artisan_id = _artisan;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esta encomenda não foi enviada para você';
  END IF;

  -- Interesse abre a conversa com o comprador, se ainda não existir.
  IF _resposta IN ('interessado', 'mais_informacoes') THEN
    INSERT INTO public.conversations (artisan_id, buyer_user_id, request_id)
    SELECT _artisan, r.buyer_user_id, r.id
    FROM public.custom_requests r
    WHERE r.id = _request_id
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.responder_encomenda(UUID, public.match_response, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.responder_encomenda(UUID, public.match_response, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- Bucket privado de anexos
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('encomendas', 'encomendas', FALSE, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/avif','application/pdf','video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Caminho: {request_id}/{arquivo}. Só participantes leem.
CREATE OR REPLACE FUNCTION public.participa_da_encomenda_no_caminho(_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _primeiro TEXT;
  _uuid     UUID;
BEGIN
  _primeiro := (storage.foldername(_name))[1];
  IF _primeiro IS NULL THEN RETURN FALSE; END IF;

  BEGIN
    _uuid := _primeiro::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  RETURN EXISTS (
    SELECT 1 FROM public.custom_requests r
    WHERE r.id = _uuid
      AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.participa_da_encomenda_no_caminho(TEXT) TO authenticated;

CREATE POLICY "Participantes leem anexos da encomenda"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'encomendas' AND public.participa_da_encomenda_no_caminho(name));

CREATE POLICY "Participantes enviam anexos da encomenda"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'encomendas' AND public.participa_da_encomenda_no_caminho(name));

CREATE POLICY "Participantes removem anexos da encomenda"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'encomendas' AND public.participa_da_encomenda_no_caminho(name));
