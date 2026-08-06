-- has_role
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.has_role(_user_id, _role) $$;

-- my_artisan_id
CREATE OR REPLACE FUNCTION private.my_artisan_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT id FROM public.artisans WHERE user_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.my_artisan_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.my_artisan_id() $$;

-- participa_da_conversa
CREATE OR REPLACE FUNCTION private.participa_da_conversa(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    LEFT JOIN public.artisans a ON a.id = c.artisan_id
    WHERE c.id = _conversation_id
      AND (c.buyer_user_id = auth.uid() OR a.user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.participa_da_conversa(_conversation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.participa_da_conversa(_conversation_id) $$;

-- pedido_tem_item_meu
CREATE OR REPLACE FUNCTION private.pedido_tem_item_meu(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.artisans a ON a.id = oi.artisan_id
    WHERE oi.order_id = _order_id AND a.user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.pedido_tem_item_meu(_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.pedido_tem_item_meu(_order_id) $$;

-- pode_avaliar
CREATE OR REPLACE FUNCTION private.pode_avaliar(_order_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = _order_item_id AND o.buyer_user_id = auth.uid() AND o.status = 'delivered'
  )
$$;

CREATE OR REPLACE FUNCTION public.pode_avaliar(_order_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.pode_avaliar(_order_item_id) $$;

-- progresso_da_loja
CREATE OR REPLACE FUNCTION private.progresso_da_loja(_artisan_id uuid)
RETURNS TABLE(etapa text, rotulo text, concluida boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.progresso_da_loja(_artisan_id uuid)
RETURNS TABLE(etapa text, rotulo text, concluida boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT * FROM private.progresso_da_loja(_artisan_id) $$;

-- criar_minha_loja
CREATE OR REPLACE FUNCTION private.criar_minha_loja(_shop_name text, _slug text, _city text DEFAULT NULL, _state character DEFAULT NULL, _bio text DEFAULT NULL)
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _nova public.artisans;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado'; END IF;
  INSERT INTO public.artisans (user_id, shop_name, slug, city, state, bio)
  VALUES (auth.uid(), _shop_name, lower(_slug), _city, _state, _bio)
  RETURNING * INTO _nova;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'artisan') ON CONFLICT DO NOTHING;
  RETURN _nova;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_minha_loja(_shop_name text, _slug text, _city text DEFAULT NULL, _state character DEFAULT NULL, _bio text DEFAULT NULL)
RETURNS public.artisans LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.criar_minha_loja(_shop_name, _slug, _city, _state, _bio) $$;

-- garantir_minha_loja
CREATE OR REPLACE FUNCTION private.garantir_minha_loja(_shop_name text DEFAULT NULL)
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _loja public.artisans; _base TEXT; _slug TEXT; _n INTEGER := 1;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado'; END IF;
  SELECT * INTO _loja FROM public.artisans WHERE user_id = auth.uid();
  IF FOUND THEN RETURN _loja; END IF;
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
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'artisan') ON CONFLICT DO NOTHING;
  RETURN _loja;
END;
$$;

CREATE OR REPLACE FUNCTION public.garantir_minha_loja(_shop_name text DEFAULT NULL)
RETURNS public.artisans LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.garantir_minha_loja(_shop_name) $$;

-- criar_pedido
CREATE OR REPLACE FUNCTION private.criar_pedido(_itens jsonb, _buyer_name text, _buyer_email text, _buyer_phone text DEFAULT NULL, _buyer_document text DEFAULT NULL, _shipping jsonb DEFAULT '{}'::jsonb, _shipping_cents integer DEFAULT 0)
RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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
      _bps := public.comissao_bps(_produto.artisan_id);
      _total := _produto.price_cents * _qtd;
      _taxa := (_total * _bps) / 10000;
      INSERT INTO public.order_items (order_id, kind, product_id, artisan_id, title, unit_price_cents, quantity, total_cents, commission_bps, platform_fee_cents, artisan_amount_cents)
      VALUES (_pedido.id, 'product', _produto.id, _produto.artisan_id, _produto.title, _produto.price_cents, _qtd, _total, _bps, _taxa, _total - _taxa);
    ELSIF _item->>'kind' = 'experience' THEN
      SELECT * INTO _exp FROM public.experiences WHERE id = (_item->>'id')::UUID FOR UPDATE;
      IF NOT FOUND OR _exp.status <> 'active' THEN RAISE EXCEPTION 'Experiência indisponível: %', _item->>'id'; END IF;
      IF _exp.capacity IS NOT NULL AND _exp.seats_taken + _qtd > _exp.capacity THEN RAISE EXCEPTION 'Não há % vaga(s) em "%"', _qtd, _exp.title; END IF;
      _bps := public.comissao_bps(_exp.artisan_id);
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
$$;

CREATE OR REPLACE FUNCTION public.criar_pedido(_itens jsonb, _buyer_name text, _buyer_email text, _buyer_phone text DEFAULT NULL, _buyer_document text DEFAULT NULL, _shipping jsonb DEFAULT '{}'::jsonb, _shipping_cents integer DEFAULT 0)
RETURNS public.orders LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ SELECT private.criar_pedido(_itens, _buyer_name, _buyer_email, _buyer_phone, _buyer_document, _shipping, _shipping_cents) $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;