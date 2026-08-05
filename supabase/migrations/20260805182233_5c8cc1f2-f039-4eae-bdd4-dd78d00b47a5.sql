DROP POLICY "Imagens seguem a visibilidade do produto" ON public.product_images;

CREATE POLICY "Imagens seguem a visibilidade do produto"
ON public.product_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND (
        (
          p.status = ANY (ARRAY['active'::public.listing_status, 'sold_out'::public.listing_status])
          AND EXISTS (
            SELECT 1 FROM public.artisans a
            WHERE a.id = p.artisan_id AND a.status = 'active'
          )
        )
        OR public.owns_artisan(p.artisan_id)
        OR public.is_admin()
      )
  )
);