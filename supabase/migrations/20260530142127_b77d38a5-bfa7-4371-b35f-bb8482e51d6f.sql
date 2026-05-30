-- Add DELETE policy for reviews (reviewer can delete via authenticated; we have no reviewer_id, so restrict to none in code-friendly way: allow artisan to delete reviews on their profile)
CREATE POLICY "Artisans can delete reviews on their profile"
ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = artisan_user_id);

-- Lock down SECURITY DEFINER functions from public API execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;