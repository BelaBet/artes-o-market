-- Loja nasce ativa, não mais "pending".
--
-- POR QUE ESTE ARQUIVO EXISTE
-- Não existia (nem existe hoje, fora deste arquivo) nenhum jeito de uma
-- loja sair de "pending" — nem o artesão, nem um admin, tinham como
-- ativá-la. Resultado: todo artesão novo ficava com produtos
-- permanentemente invisíveis pro público (a policy pública de produtos
-- exige artisans.status = 'active'), sem perceber por quê.
--
-- Até existir um painel de aprovação de verdade, a loja nasce ativa.
ALTER TABLE public.artisans ALTER COLUMN status SET DEFAULT 'active';

CREATE OR REPLACE FUNCTION private.garantir_minha_loja(_shop_name text DEFAULT NULL::text)
RETURNS public.artisans LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _loja public.artisans; _base TEXT; _slug TEXT; _n INTEGER := 1;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar autenticado'; END IF;
  SELECT * INTO _loja FROM public.artisans WHERE user_id = auth.uid();
  IF FOUND THEN RETURN _loja; END IF;
  _base := NULLIF(public.gerar_slug(COALESCE(_shop_name, 'atelie')), '');
  _base := COALESCE(_base, 'atelie');
  _slug := _base;
  WHILE EXISTS (SELECT 1 FROM public.artisans WHERE slug = _slug) LOOP
    _n := _n + 1; _slug := _base || '-' || _n;
  END LOOP;
  INSERT INTO public.artisans (user_id, shop_name, slug, status)
  VALUES (auth.uid(), COALESCE(NULLIF(trim(_shop_name), ''), 'Meu Ateliê'), _slug, 'active')
  RETURNING * INTO _loja;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'artisan') ON CONFLICT DO NOTHING;
  RETURN _loja;
END;
$function$;
