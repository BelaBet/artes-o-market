-- =====================================================================
-- 9 — Campos dos blocos avançados de Minha Loja
--
-- Nada aqui entra no onboarding: são campos que o artesão preenche aos
-- poucos, depois, dentro de Minha Loja. Todos opcionais.
-- =====================================================================

ALTER TABLE public.artisans
  -- Encomendas
  ADD COLUMN IF NOT EXISTS min_order_value_cents INTEGER CHECK (min_order_value_cents >= 0),
  ADD COLUMN IF NOT EXISTS delivery_regions      TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_order_notes    TEXT,

  -- Aulas, oficinas e visitas
  ADD COLUMN IF NOT EXISTS teaching_notes        TEXT,
  ADD COLUMN IF NOT EXISTS accessibility_notes   TEXT,
  ADD COLUMN IF NOT EXISTS visit_by_appointment  BOOLEAN NOT NULL DEFAULT TRUE,

  -- Empresas
  ADD COLUMN IF NOT EXISTS company_name          TEXT,
  -- CNPJ: dado sensível, nunca exibido na loja
  ADD COLUMN IF NOT EXISTS company_document      TEXT,
  ADD COLUMN IF NOT EXISTS issues_invoice        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS corporate_min_quantity INTEGER CHECK (corporate_min_quantity >= 0),

  -- Informações adicionais
  ADD COLUMN IF NOT EXISTS additional_notes      TEXT;

COMMENT ON COLUMN public.artisans.delivery_regions IS
  'Siglas de UF ou nomes de região que o artesão atende. Vazio = não informado.';
COMMENT ON COLUMN public.artisans.company_document IS
  'CNPJ. Dado fiscal — não deve aparecer em página pública.';
COMMENT ON COLUMN public.artisans.min_order_value_cents IS
  'Valor mínimo aceito em encomenda, em centavos.';

-- O CNPJ não vaza na listagem pública da vitrine.
REVOKE SELECT (company_document) ON public.artisans FROM anon;

-- ---------------------------------------------------------------------
-- Conclusão do onboarding
--
-- `onboarding_completed_at` já existe (migration 7) mas nada o preenchia.
-- Esta função marca a conclusão sem deixar o front inventar a data.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.concluir_onboarding()
RETURNS public.artisans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

REVOKE EXECUTE ON FUNCTION public.concluir_onboarding() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.concluir_onboarding() TO authenticated;
