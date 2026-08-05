-- =====================================================================
-- 6/6 — Loja curada (sem dono ainda) e reivindicação
--
-- Marketplace de artesanato quase nunca começa com o artesão se
-- cadastrando sozinho: a curadoria cadastra a loja, publica as peças, e
-- só depois o artesão recebe o acesso. Por isso `user_id` passa a ser
-- opcional — a loja existe antes de ter login.
-- =====================================================================

ALTER TABLE public.artisans ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.artisans.user_id IS
  'Nulo enquanto a loja for gerida pela curadoria. Preenchido quando o artesão reivindica o acesso.';

-- `owns_artisan` continua correto: user_id NULL nunca casa com auth.uid().
-- Mas o UNIQUE precisa virar parcial, senão só uma loja poderia ficar
-- sem dono (dois NULLs colidiriam em alguns cenários de índice).
ALTER TABLE public.artisans DROP CONSTRAINT IF EXISTS artisans_user_id_key;
CREATE UNIQUE INDEX artisans_user_id_uniq
  ON public.artisans (user_id) WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Código de reivindicação
--
-- A curadoria gera um código e entrega ao artesão (WhatsApp, presencial).
-- Ele cria a conta e troca o código pelo acesso à loja.
-- ---------------------------------------------------------------------
ALTER TABLE public.artisans
  ADD COLUMN claim_code TEXT UNIQUE,
  ADD COLUMN claimed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.reivindicar_loja(_claim_code TEXT)
RETURNS public.artisans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _loja public.artisans;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É preciso estar autenticado';
  END IF;

  SELECT * INTO _loja FROM public.artisans
  WHERE claim_code = _claim_code AND user_id IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Mensagem propositalmente genérica: dizer "código existe mas já foi
    -- usado" ajudaria alguém a descobrir códigos por tentativa.
    RAISE EXCEPTION 'Código inválido';
  END IF;

  IF EXISTS (SELECT 1 FROM public.artisans WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Esta conta já está vinculada a uma loja';
  END IF;

  UPDATE public.artisans
  SET user_id    = auth.uid(),
      claim_code = NULL,
      claimed_at = now()
  WHERE id = _loja.id
  RETURNING * INTO _loja;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'artisan')
  ON CONFLICT DO NOTHING;

  RETURN _loja;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reivindicar_loja(TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reivindicar_loja(TEXT) TO authenticated;

-- O código não pode vazar na listagem pública da vitrine.
REVOKE SELECT (claim_code) ON public.artisans FROM anon, authenticated;
