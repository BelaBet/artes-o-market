-- =====================================================================
-- 5/5 — Storage: buckets e políticas de upload
--
-- Convenção de caminho: {artisan_id}/{resto}. O artisan_id PRECISA ser o
-- primeiro segmento — é ele que a policy usa para isolar as lojas.
-- Ex.: 3f1c.../produtos/vaso-01.webp
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('produtos',    'produtos',    TRUE, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('lojas',       'lojas',       TRUE, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('experiencias','experiencias',TRUE, 5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/avif'])
ON CONFLICT (id) DO NOTHING;

-- Helper: o primeiro segmento do caminho é uma loja minha?
CREATE OR REPLACE FUNCTION public.caminho_e_da_minha_loja(_name TEXT)
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
  IF _primeiro IS NULL THEN
    RETURN FALSE;
  END IF;

  -- caminho sem UUID válido no início não pertence a ninguém
  BEGIN
    _uuid := _primeiro::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  RETURN public.owns_artisan(_uuid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.caminho_e_da_minha_loja(TEXT) TO authenticated;

CREATE POLICY "Imagens são públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('produtos', 'lojas', 'experiencias'));

CREATE POLICY "Artesão envia arquivo na própria pasta"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('produtos', 'lojas', 'experiencias')
    AND public.caminho_e_da_minha_loja(name)
  );

CREATE POLICY "Artesão atualiza arquivo da própria pasta"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('produtos', 'lojas', 'experiencias')
    AND public.caminho_e_da_minha_loja(name)
  )
  WITH CHECK (
    bucket_id IN ('produtos', 'lojas', 'experiencias')
    AND public.caminho_e_da_minha_loja(name)
  );

CREATE POLICY "Artesão apaga arquivo da própria pasta"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id IN ('produtos', 'lojas', 'experiencias')
    AND public.caminho_e_da_minha_loja(name)
  );
