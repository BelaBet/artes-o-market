-- 1. Ownership nas encomendas
DROP POLICY IF EXISTS "Itens seguem a encomenda" ON public.custom_request_items;
CREATE POLICY "Itens seguem a encomenda"
ON public.custom_request_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.custom_requests r
  WHERE r.id = custom_request_items.request_id
    AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id) OR public.is_admin())
));

DROP POLICY IF EXISTS "Anexos seguem a encomenda" ON public.custom_request_attachments;
CREATE POLICY "Anexos seguem a encomenda"
ON public.custom_request_attachments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.custom_requests r
  WHERE r.id = custom_request_attachments.request_id
    AND (r.buyer_user_id = auth.uid() OR public.encomenda_e_minha(r.id) OR public.is_admin())
));

-- 2. SECURITY DEFINER sai do schema exposto
CREATE OR REPLACE FUNCTION private.encomenda_e_minha(_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_request_matches m
    JOIN public.artisans a ON a.id = m.artisan_id
    WHERE m.request_id = _request_id AND a.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.encomenda_e_minha(_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT private.encomenda_e_minha(_request_id) $$;

CREATE OR REPLACE FUNCTION private.comissao_bps(_artisan_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT commission_bps FROM public.artisan_billing WHERE artisan_id = _artisan_id),
    (SELECT default_commission_bps FROM public.platform_settings WHERE id)
  );
$$;

CREATE OR REPLACE FUNCTION public.comissao_bps(_artisan_id uuid)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT private.comissao_bps(_artisan_id) $$;

CREATE OR REPLACE FUNCTION private.taxa_de_servico(_subtotal_cents integer, _metodo public.payment_method)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _metodo
    WHEN 'pix'         THEN (_subtotal_cents * (SELECT service_fee_pix_bps  FROM public.platform_settings WHERE id)) / 10000
    WHEN 'credit_card' THEN (_subtotal_cents * (SELECT service_fee_card_bps FROM public.platform_settings WHERE id)) / 10000
    WHEN 'boleto'      THEN (SELECT service_fee_boleto_cents FROM public.platform_settings WHERE id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.taxa_de_servico(_subtotal_cents integer, _metodo public.payment_method)
RETURNS integer LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT private.taxa_de_servico(_subtotal_cents, _metodo) $$;

CREATE OR REPLACE FUNCTION private.participa_da_encomenda_no_caminho(_name text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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
      AND (r.buyer_user_id = auth.uid() OR private.encomenda_e_minha(r.id))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.participa_da_encomenda_no_caminho(_name text)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS
$$ SELECT private.participa_da_encomenda_no_caminho(_name) $$;

CREATE OR REPLACE FUNCTION private.distribuir_encomenda(_request_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _req      public.custom_requests;
  _inseridos INTEGER := 0;
BEGIN
  SELECT * INTO _req FROM public.custom_requests WHERE id = _request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Encomenda não encontrada';
  END IF;

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
    SELECT
      a.id,
      (
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
  LIMIT _req.max_proposals
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS _inseridos = ROW_COUNT;
  RETURN _inseridos;
END;
$$;

CREATE OR REPLACE FUNCTION public.distribuir_encomenda(_request_id uuid)
RETURNS integer LANGUAGE sql SET search_path = public AS
$$ SELECT private.distribuir_encomenda(_request_id) $$;

CREATE OR REPLACE FUNCTION private.enviar_encomenda(_request_id uuid)
RETURNS public.custom_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  _encontrados := private.distribuir_encomenda(_request_id);

  UPDATE public.custom_requests
  SET status = CASE WHEN _encontrados > 0 THEN 'recebendo_propostas'::public.request_status
                    ELSE 'em_distribuicao'::public.request_status END
  WHERE id = _request_id
  RETURNING * INTO _req;

  RETURN _req;
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_encomenda(_request_id uuid)
RETURNS public.custom_requests LANGUAGE sql SET search_path = public AS
$$ SELECT private.enviar_encomenda(_request_id) $$;

CREATE OR REPLACE FUNCTION private.responder_encomenda(_request_id uuid, _resposta public.match_response, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _artisan UUID;
BEGIN
  _artisan := private.my_artisan_id();
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

  IF _resposta IN ('interessado', 'mais_informacoes') THEN
    INSERT INTO public.conversations (artisan_id, buyer_user_id, request_id)
    SELECT _artisan, r.buyer_user_id, r.id
    FROM public.custom_requests r
    WHERE r.id = _request_id
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.responder_encomenda(_request_id uuid, _resposta public.match_response, _motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = public AS
$$ BEGIN PERFORM private.responder_encomenda(_request_id, _resposta, _motivo); END; $$;

CREATE OR REPLACE FUNCTION private.concluir_onboarding()
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _loja public.artisans;
BEGIN
  UPDATE public.artisans
  SET onboarding_completed_at = COALESCE(onboarding_completed_at, now()),
      onboarding_step = NULL
  WHERE user_id = auth.uid()
  RETURNING * INTO _loja;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;

  RETURN _loja;
END;
$$;

CREATE OR REPLACE FUNCTION public.concluir_onboarding()
RETURNS public.artisans LANGUAGE sql SET search_path = public AS
$$ SELECT private.concluir_onboarding() $$;

CREATE OR REPLACE FUNCTION private.definir_pagamento(_order_id uuid, _metodo public.payment_method, _installments integer DEFAULT 1)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pedido public.orders;
  _taxa   INTEGER;
BEGIN
  SELECT * INTO _pedido FROM public.orders
  WHERE id = _order_id AND buyer_user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  IF _pedido.status <> 'pending' THEN
    RAISE EXCEPTION 'Este pedido já foi processado';
  END IF;

  _taxa := private.taxa_de_servico(_pedido.subtotal_cents, _metodo);

  UPDATE public.orders
  SET payment_method    = _metodo,
      installments      = CASE WHEN _metodo = 'credit_card' THEN GREATEST(_installments, 1) ELSE 1 END,
      service_fee_cents = _taxa,
      total_cents       = _pedido.subtotal_cents + _pedido.shipping_cents
                          - _pedido.discount_cents + _taxa
  WHERE id = _order_id
  RETURNING * INTO _pedido;

  RETURN _pedido;
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_pagamento(_order_id uuid, _metodo public.payment_method, _installments integer DEFAULT 1)
RETURNS public.orders LANGUAGE sql SET search_path = public AS
$$ SELECT private.definir_pagamento(_order_id, _metodo, _installments) $$;

REVOKE ALL ON FUNCTION private.encomenda_e_minha(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.comissao_bps(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.taxa_de_servico(integer, public.payment_method) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.participa_da_encomenda_no_caminho(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.distribuir_encomenda(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enviar_encomenda(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.responder_encomenda(uuid, public.match_response, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.concluir_onboarding() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.definir_pagamento(uuid, public.payment_method, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.encomenda_e_minha(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.comissao_bps(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.taxa_de_servico(integer, public.payment_method) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.participa_da_encomenda_no_caminho(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.distribuir_encomenda(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.enviar_encomenda(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.responder_encomenda(uuid, public.match_response, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.concluir_onboarding() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.definir_pagamento(uuid, public.payment_method, integer) TO authenticated, service_role;