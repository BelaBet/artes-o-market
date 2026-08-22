-- 1) Tira colunas sensíveis do alcance de leitura pública/direta
REVOKE SELECT (company_document, company_name, whatsapp) ON public.artisans FROM anon, authenticated;

-- 2) Vitrine pública: só colunas seguras, whatsapp respeitando a preferência
CREATE OR REPLACE VIEW public.artisans_publicas AS
SELECT
  a.id, a.slug, a.shop_name, a.public_name, a.headline, a.bio, a.city, a.state,
  a.avatar_url, a.cover_url, a.logo_url, a.workshop_image_url, a.working_image_url,
  a.instagram, a.facebook, a.website,
  CASE WHEN a.whatsapp_publico THEN a.whatsapp END AS whatsapp,
  a.whatsapp_publico,
  a.verified, a.status,
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

-- 3) Painel: o dono continua vendo a própria loja completa
CREATE OR REPLACE VIEW public.minha_loja AS
SELECT a.* FROM public.artisans a WHERE a.user_id = auth.uid();

GRANT SELECT ON public.minha_loja TO authenticated;