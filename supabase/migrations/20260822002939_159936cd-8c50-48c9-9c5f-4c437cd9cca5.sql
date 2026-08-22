DROP VIEW IF EXISTS public.minha_loja;
DROP VIEW IF EXISTS public.artisans_publicas;

-- WhatsApp só sai quando o artesão autorizou
CREATE OR REPLACE FUNCTION private.whatsapp_publico_da_loja(_artisan_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN a.whatsapp_publico THEN a.whatsapp END
  FROM public.artisans a
  WHERE a.id = _artisan_id AND a.status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.whatsapp_da_loja(_artisan_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT private.whatsapp_publico_da_loja(_artisan_id) $$;

REVOKE ALL ON FUNCTION private.whatsapp_publico_da_loja(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_da_loja(uuid) TO anon, authenticated;

-- Vitrine pública sem CNPJ/razão social e com WhatsApp condicionado
CREATE VIEW public.artisans_publicas
WITH (security_invoker = on, security_barrier = true) AS
SELECT
  a.id, a.slug, a.shop_name, a.public_name, a.headline, a.bio, a.city, a.state,
  a.avatar_url, a.cover_url, a.logo_url, a.workshop_image_url, a.working_image_url,
  a.instagram, a.facebook, a.website,
  public.whatsapp_da_loja(a.id) AS whatsapp,
  a.whatsapp_publico, a.verified, a.status,
  a.years_of_experience, a.production_capacity_monthly, a.average_production_days,
  a.minimum_order_days, a.team_size,
  a.accepts_custom_orders, a.accepts_large_orders, a.ships_nationwide,
  a.has_ready_stock, a.sells_to_people, a.sells_to_companies, a.sells_to_stores,
  a.sells_to_architects, a.receives_visitors, a.visit_by_appointment,
  a.delivery_regions, a.min_order_value_cents, a.custom_order_notes,
  a.teaching_notes, a.accessibility_notes, a.additional_notes,
  a.created_at, a.updated_at
FROM public.artisans a
WHERE a.status = 'active';

GRANT SELECT ON public.artisans_publicas TO anon, authenticated;

-- Painel: o dono lê a própria loja completa por função (sem expor colunas na tabela)
CREATE OR REPLACE FUNCTION private.minha_loja_completa()
RETURNS public.artisans
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT a.* FROM public.artisans a WHERE a.user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.minha_loja()
RETURNS public.artisans
LANGUAGE sql
STABLE
SET search_path = public
AS $$ SELECT private.minha_loja_completa() $$;

REVOKE ALL ON FUNCTION private.minha_loja_completa() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.minha_loja() TO authenticated;