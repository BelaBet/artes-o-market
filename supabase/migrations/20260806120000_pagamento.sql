-- =====================================================================
-- 10 — Pagamento: taxa de serviço, recebedor e webhook
-- =====================================================================

-- ---------------------------------------------------------------------
-- Taxa de serviço
--
-- Separada da comissão e do frete de propósito: comissão é o que a
-- plataforma ganha, taxa de serviço é o custo de meio de pagamento
-- repassado ao comprador. Misturar as duas torna impossível saber
-- depois quanto o negócio realmente ganhou.
-- ---------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service_fee_cents INTEGER NOT NULL DEFAULT 0
    CHECK (service_fee_cents >= 0),
  ADD COLUMN IF NOT EXISTS installments INTEGER NOT NULL DEFAULT 1
    CHECK (installments BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS pix_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boleto_url TEXT,
  ADD COLUMN IF NOT EXISTS boleto_line TEXT,
  ADD COLUMN IF NOT EXISTS payment_error TEXT;

COMMENT ON COLUMN public.orders.service_fee_cents IS
  'Custo de meio de pagamento repassado ao comprador. Vai para a plataforma no split.';

-- Percentuais da taxa de serviço, editáveis sem deploy.
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS service_fee_pix_bps    INTEGER NOT NULL DEFAULT 99
    CHECK (service_fee_pix_bps BETWEEN 0 AND 2000),
  ADD COLUMN IF NOT EXISTS service_fee_card_bps   INTEGER NOT NULL DEFAULT 399
    CHECK (service_fee_card_bps BETWEEN 0 AND 2000),
  ADD COLUMN IF NOT EXISTS service_fee_boleto_cents INTEGER NOT NULL DEFAULT 349
    CHECK (service_fee_boleto_cents >= 0);

COMMENT ON COLUMN public.platform_settings.service_fee_boleto_cents IS
  'Boleto tem custo fixo, não percentual — por isso em centavos.';

-- ---------------------------------------------------------------------
-- Recebedor no Pagar.me
--
-- Guardamos apenas o id e o andamento. CPF, conta bancária e endereço
-- ficam com o Pagar.me, que tem obrigação regulatória de guardá-los.
-- Este repositório é público; dado pessoal de artesão não passa por aqui.
-- ---------------------------------------------------------------------
ALTER TABLE public.artisan_billing
  ADD COLUMN IF NOT EXISTS recipient_status TEXT,
  ADD COLUMN IF NOT EXISTS kyc_status       TEXT,
  ADD COLUMN IF NOT EXISTS kyc_url          TEXT,
  ADD COLUMN IF NOT EXISTS kyc_url_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS can_withdraw     BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.artisan_billing.can_withdraw IS
  'Falso até a prova de vida ser aprovada. O artesão vende antes, mas não saca.';

-- O artesão precisa ver o próprio andamento — sem ver comissão.
CREATE OR REPLACE VIEW public.meu_recebimento
WITH (security_invoker = TRUE) AS
  SELECT b.artisan_id,
         (b.pagarme_recipient_id IS NOT NULL) AS cadastrado,
         b.recipient_status,
         b.kyc_status,
         b.kyc_url,
         b.kyc_url_expires_at,
         b.can_withdraw
  FROM public.artisan_billing b
  JOIN public.artisans a ON a.id = b.artisan_id
  WHERE a.user_id = auth.uid();

GRANT SELECT ON public.meu_recebimento TO authenticated;

-- A view roda como quem chama e a tabela é admin-only, então precisa de
-- uma policy própria de leitura para o dono da loja.
CREATE POLICY "Artesão vê o andamento do próprio cadastro"
  ON public.artisan_billing FOR SELECT TO authenticated
  USING (public.owns_artisan(artisan_id));

-- ---------------------------------------------------------------------
-- Eventos do Pagar.me
--
-- Webhook repete: a mesma notificação chega mais de uma vez em falha de
-- rede. Sem registro do que já foi processado, um pedido pago duas vezes
-- baixaria estoque duas vezes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pagarme_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     TEXT NOT NULL UNIQUE,
  event_type   TEXT NOT NULL,
  order_id     UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payload      JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pagarme_events_order_idx ON public.pagarme_events (order_id);

ALTER TABLE public.pagarme_events ENABLE ROW LEVEL SECURITY;

-- Ninguém lê pela API: é registro interno, gravado pela service role.
CREATE POLICY "Só admin lê eventos de pagamento"
  ON public.pagarme_events FOR SELECT TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- Cálculo da taxa de serviço
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.taxa_de_servico(
  _subtotal_cents INTEGER,
  _metodo         public.payment_method
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _metodo
    WHEN 'pix'         THEN (_subtotal_cents * (SELECT service_fee_pix_bps  FROM platform_settings WHERE id)) / 10000
    WHEN 'credit_card' THEN (_subtotal_cents * (SELECT service_fee_card_bps FROM platform_settings WHERE id)) / 10000
    WHEN 'boleto'      THEN (SELECT service_fee_boleto_cents FROM platform_settings WHERE id)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.taxa_de_servico(INTEGER, public.payment_method) TO authenticated;

-- ---------------------------------------------------------------------
-- Fixar o meio de pagamento e recalcular o total
--
-- Roda no servidor: o total que vai ao Pagar.me nunca vem do navegador.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.definir_pagamento(
  _order_id     UUID,
  _metodo       public.payment_method,
  _installments INTEGER DEFAULT 1
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  _taxa := public.taxa_de_servico(_pedido.subtotal_cents, _metodo);

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

REVOKE EXECUTE ON FUNCTION public.definir_pagamento(UUID, public.payment_method, INTEGER) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.definir_pagamento(UUID, public.payment_method, INTEGER) TO authenticated;
