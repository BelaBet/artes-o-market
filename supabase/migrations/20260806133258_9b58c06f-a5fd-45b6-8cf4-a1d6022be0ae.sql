CREATE OR REPLACE FUNCTION private.avaliacao_apenas_resposta(
  _id uuid, _rating smallint, _comment text, _author_id uuid,
  _order_item_id uuid, _artisan_id uuid, _product_id uuid, _experience_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = _id
      AND r.rating IS NOT DISTINCT FROM _rating
      AND r.comment IS NOT DISTINCT FROM _comment
      AND r.author_id IS NOT DISTINCT FROM _author_id
      AND r.order_item_id IS NOT DISTINCT FROM _order_item_id
      AND r.artisan_id IS NOT DISTINCT FROM _artisan_id
      AND r.product_id IS NOT DISTINCT FROM _product_id
      AND r.experience_id IS NOT DISTINCT FROM _experience_id
  );
$$;

REVOKE ALL ON FUNCTION private.avaliacao_apenas_resposta(uuid, smallint, text, uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.avaliacao_apenas_resposta(
  _id uuid, _rating smallint, _comment text, _author_id uuid,
  _order_item_id uuid, _artisan_id uuid, _product_id uuid, _experience_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT private.avaliacao_apenas_resposta(_id, _rating, _comment, _author_id, _order_item_id, _artisan_id, _product_id, _experience_id) $$;

DROP POLICY IF EXISTS "Artesão responde avaliação da própria loja" ON public.reviews;

CREATE POLICY "Artesão responde avaliação da própria loja"
ON public.reviews
FOR UPDATE
TO authenticated
USING (public.owns_artisan(artisan_id))
WITH CHECK (
  public.owns_artisan(artisan_id)
  AND public.avaliacao_apenas_resposta(
        id, rating, comment, author_id, order_item_id, artisan_id, product_id, experience_id
      )
);