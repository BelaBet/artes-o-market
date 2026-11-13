-- Categoria "Outros", pra peças que não se encaixam nas categorias
-- existentes. Position 99 pra sempre ficar por último no seletor.
INSERT INTO public.categories (slug, name, position) VALUES ('outros', 'Outros', 99)
ON CONFLICT (slug) DO NOTHING;
