
-- Fix overly permissive INSERT policy on reviews
DROP POLICY "Authenticated users can insert reviews" ON public.reviews;

CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND artisan_user_id != auth.uid());
