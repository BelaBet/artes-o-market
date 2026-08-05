-- =====================================================================
-- 3/5 — Pedidos, itens, comissão e baixa de estoque
--
-- Um pedido pode conter itens de vários artesãos (é marketplace). Por
-- isso a comissão e o valor do artesão são calculados e congelados por
-- ITEM, não por pedido — é isso que alimenta o split no Pagar.me.
-- =====================================================================

CREATE TYPE public.order_status AS ENUM (
  'pending',    -- criado, aguardando pagamento
  'paid',       -- pago e confirmado
  'processing', -- artesão produzindo/separando
  'shipped',
  'delivered',
  'canceled',
  'refunded'
);

CREATE TYPE public.payment_method AS ENUM ('pix', 'credit_card', 'boleto');
CREATE TYPE public.order_item_kind AS ENUM ('product', 'experience');

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
CREATE TABLE public.orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- número curto e legível para o cliente ("#4521")
  number             BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1000),
  buyer_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  buyer_email        TEXT NOT NULL,
  buyer_name         TEXT NOT NULL,
  buyer_phone        TEXT,
  buyer_document     TEXT, -- CPF: exigido pelo Pagar.me em PIX/boleto

  status             public.order_status NOT NULL DEFAULT 'pending',

  subtotal_cents     INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  shipping_cents     INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  discount_cents     INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents        INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  platform_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),

  -- endereço congelado no momento da compra
  shipping_zipcode   TEXT,
  shipping_street    TEXT,
  shipping_number    TEXT,
  shipping_complement TEXT,
  shipping_district  TEXT,
  shipping_city      TEXT,
  shipping_state     CHAR(2),

  payment_method     public.payment_method,
  pagarme_order_id   TEXT UNIQUE,
  pagarme_charge_id  TEXT,
  paid_at            TIMESTAMPTZ,
  canceled_at        TIMESTAMPTZ,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_idx  ON public.orders (buyer_user_id, created_at DESC);
CREATE INDEX orders_status_idx ON public.orders (status);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Itens do pedido
-- ---------------------------------------------------------------------
CREATE TABLE public.order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind                 public.order_item_kind NOT NULL,
  product_id           UUID REFERENCES public.products(id) ON DELETE SET NULL,
  experience_id        UUID REFERENCES public.experiences(id) ON DELETE SET NULL,
  artisan_id           UUID NOT NULL REFERENCES public.artisans(id) ON DELETE RESTRICT,

  -- snapshot: se o artesão renomear ou reprecificar depois, o histórico
  -- do pedido não muda
  title                TEXT NOT NULL,
  image_path           TEXT,
  unit_price_cents     INTEGER NOT NULL CHECK (unit_price_cents > 0),
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_cents          INTEGER NOT NULL CHECK (total_cents > 0),

  -- congelados no momento da compra: alterar a comissão depois não
  -- reescreve o passado
  commission_bps       INTEGER NOT NULL CHECK (commission_bps BETWEEN 0 AND 10000),
  platform_fee_cents   INTEGER NOT NULL CHECK (platform_fee_cents >= 0),
  artisan_amount_cents INTEGER NOT NULL CHECK (artisan_amount_cents >= 0),

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_referencia_o_tipo_certo CHECK (
    (kind = 'product'    AND product_id    IS NOT NULL AND experience_id IS NULL) OR
    (kind = 'experience' AND experience_id IS NOT NULL AND product_id    IS NULL)
  ),
  CONSTRAINT split_fecha_com_o_total
    CHECK (platform_fee_cents + artisan_amount_cents = total_cents)
);

CREATE INDEX order_items_order_idx   ON public.order_items (order_id);
CREATE INDEX order_items_artisan_idx ON public.order_items (artisan_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Policies de pedido
--
-- Comprador vê o próprio pedido inteiro. Artesão vê pedidos que contêm
-- item dele — mas o cálculo fica em função SECURITY DEFINER para não
-- criar recursão entre orders e order_items.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pedido_tem_item_meu(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.artisans a ON a.id = oi.artisan_id
    WHERE oi.order_id = _order_id AND a.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.pedido_tem_item_meu(UUID) TO authenticated;

CREATE POLICY "Comprador e artesão envolvido veem o pedido"
  ON public.orders FOR SELECT TO authenticated
  USING (
    buyer_user_id = auth.uid()
    OR public.pedido_tem_item_meu(id)
    OR public.is_admin()
  );

-- O pedido nasce como 'pending' e sem valores dados pelo cliente:
-- os totais são recalculados no servidor (função abaixo).
CREATE POLICY "Comprador cria o próprio pedido"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid() AND status = 'pending');

-- Comprador NÃO atualiza pedido (nem para cancelar: isso passa por
-- função, que valida o estado). Artesão só muda o andamento logístico.
CREATE POLICY "Artesão atualiza pedido em que tem item"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.pedido_tem_item_meu(id))
  WITH CHECK (public.pedido_tem_item_meu(id));

CREATE POLICY "Admin atualiza qualquer pedido"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Itens seguem a visibilidade do pedido"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.buyer_user_id = auth.uid())
    OR public.owns_artisan(artisan_id)
    OR public.is_admin()
  );

-- Itens só entram via função de checkout — o preço vem do banco, nunca
-- do cliente. Sem isso, dá para comprar uma peça de R$210 por R$1.
CREATE POLICY "Ninguém insere item direto"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (FALSE);

-- ---------------------------------------------------------------------
-- Comissão vigente do artesão
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.comissao_bps(_artisan_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT commission_bps FROM public.artisans WHERE id = _artisan_id),
    (SELECT default_commission_bps FROM public.platform_settings WHERE id)
  );
$$;

-- ---------------------------------------------------------------------
-- Checkout: monta o pedido no servidor a partir do carrinho
--
-- Recebe [{ "kind": "product", "id": "...", "quantity": 2 }, ...].
-- Valida disponibilidade, lê o preço do banco, calcula comissão e
-- devolve o pedido criado (status 'pending', pronto para o Pagar.me).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_pedido(
  _itens          JSONB,
  _buyer_name     TEXT,
  _buyer_email    TEXT,
  _buyer_phone    TEXT DEFAULT NULL,
  _buyer_document TEXT DEFAULT NULL,
  _shipping       JSONB DEFAULT '{}'::JSONB,
  _shipping_cents INTEGER DEFAULT 0
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pedido    public.orders;
  _item      JSONB;
  _qtd       INTEGER;
  _produto   public.products;
  _exp       public.experiences;
  _bps       INTEGER;
  _total     INTEGER;
  _taxa      INTEGER;
  _subtotal  INTEGER := 0;
  _taxa_total INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É preciso estar autenticado para comprar';
  END IF;

  IF _itens IS NULL OR jsonb_array_length(_itens) = 0 THEN
    RAISE EXCEPTION 'Carrinho vazio';
  END IF;

  INSERT INTO public.orders (
    buyer_user_id, buyer_email, buyer_name, buyer_phone, buyer_document,
    shipping_cents,
    shipping_zipcode, shipping_street, shipping_number, shipping_complement,
    shipping_district, shipping_city, shipping_state
  ) VALUES (
    auth.uid(), _buyer_email, _buyer_name, _buyer_phone, _buyer_document,
    GREATEST(_shipping_cents, 0),
    _shipping->>'zipcode', _shipping->>'street', _shipping->>'number',
    _shipping->>'complement', _shipping->>'district', _shipping->>'city',
    _shipping->>'state'
  )
  RETURNING * INTO _pedido;

  FOR _item IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    _qtd := GREATEST(COALESCE((_item->>'quantity')::INTEGER, 1), 1);

    IF _item->>'kind' = 'product' THEN
      -- FOR UPDATE: trava a linha até o fim da transação, evitando que
      -- duas pessoas comprem a mesma peça única ao mesmo tempo.
      SELECT * INTO _produto FROM public.products
      WHERE id = (_item->>'id')::UUID FOR UPDATE;

      IF NOT FOUND OR _produto.status <> 'active' THEN
        RAISE EXCEPTION 'Peça indisponível: %', _item->>'id';
      END IF;

      IF _produto.stock_quantity < _qtd THEN
        RAISE EXCEPTION 'Estoque insuficiente para "%"', _produto.title;
      END IF;

      _bps   := public.comissao_bps(_produto.artisan_id);
      _total := _produto.price_cents * _qtd;
      _taxa  := (_total * _bps) / 10000;

      INSERT INTO public.order_items (
        order_id, kind, product_id, artisan_id, title,
        unit_price_cents, quantity, total_cents,
        commission_bps, platform_fee_cents, artisan_amount_cents
      ) VALUES (
        _pedido.id, 'product', _produto.id, _produto.artisan_id, _produto.title,
        _produto.price_cents, _qtd, _total,
        _bps, _taxa, _total - _taxa
      );

    ELSIF _item->>'kind' = 'experience' THEN
      SELECT * INTO _exp FROM public.experiences
      WHERE id = (_item->>'id')::UUID FOR UPDATE;

      IF NOT FOUND OR _exp.status <> 'active' THEN
        RAISE EXCEPTION 'Experiência indisponível: %', _item->>'id';
      END IF;

      IF _exp.capacity IS NOT NULL AND _exp.seats_taken + _qtd > _exp.capacity THEN
        RAISE EXCEPTION 'Não há % vaga(s) em "%"', _qtd, _exp.title;
      END IF;

      _bps   := public.comissao_bps(_exp.artisan_id);
      _total := _exp.price_cents * _qtd;
      _taxa  := (_total * _bps) / 10000;

      INSERT INTO public.order_items (
        order_id, kind, experience_id, artisan_id, title,
        unit_price_cents, quantity, total_cents,
        commission_bps, platform_fee_cents, artisan_amount_cents
      ) VALUES (
        _pedido.id, 'experience', _exp.id, _exp.artisan_id, _exp.title,
        _exp.price_cents, _qtd, _total,
        _bps, _taxa, _total - _taxa
      );

    ELSE
      RAISE EXCEPTION 'Tipo de item desconhecido: %', _item->>'kind';
    END IF;

    _subtotal   := _subtotal + _total;
    _taxa_total := _taxa_total + _taxa;
  END LOOP;

  UPDATE public.orders
  SET subtotal_cents     = _subtotal,
      platform_fee_cents = _taxa_total,
      total_cents        = _subtotal + GREATEST(_shipping_cents, 0)
  WHERE id = _pedido.id
  RETURNING * INTO _pedido;

  RETURN _pedido;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_pedido(JSONB, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.criar_pedido(JSONB, TEXT, TEXT, TEXT, TEXT, JSONB, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------
-- Baixa de estoque no pagamento confirmado
--
-- Só quando o pedido vira 'paid'. Reservar no 'pending' travaria peça
-- por causa de carrinho abandonado.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.baixar_estoque_no_pagamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _it RECORD;
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    FOR _it IN
      SELECT * FROM public.order_items WHERE order_id = NEW.id
    LOOP
      IF _it.kind = 'product' AND _it.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(stock_quantity - _it.quantity, 0),
            status = CASE
              WHEN stock_quantity - _it.quantity <= 0 THEN 'sold_out'::public.listing_status
              ELSE status
            END
        WHERE id = _it.product_id;

      ELSIF _it.kind = 'experience' AND _it.experience_id IS NOT NULL THEN
        UPDATE public.experiences
        SET seats_taken = seats_taken + _it.quantity,
            status = CASE
              WHEN capacity IS NOT NULL AND seats_taken + _it.quantity >= capacity
                THEN 'sold_out'::public.listing_status
              ELSE status
            END
        WHERE id = _it.experience_id;
      END IF;
    END LOOP;

    NEW.paid_at := COALESCE(NEW.paid_at, now());
  END IF;

  -- Cancelamento/estorno devolve o que foi baixado.
  IF NEW.status IN ('canceled', 'refunded') AND OLD.status = 'paid' THEN
    FOR _it IN
      SELECT * FROM public.order_items WHERE order_id = NEW.id
    LOOP
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
$$;

CREATE TRIGGER orders_baixa_estoque
  BEFORE UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.baixar_estoque_no_pagamento();

REVOKE EXECUTE ON FUNCTION public.baixar_estoque_no_pagamento() FROM PUBLIC, anon, authenticated;
