-- =====================================================================
-- Seed de demonstração
--
-- Reproduz no banco o conteúdo que hoje vive em src/lib/data.ts, para o
-- front poder ler do Supabase sem a vitrine ficar vazia.
--
-- As lojas nascem SEM dono (user_id nulo) e com claim_code: é a curadoria
-- cadastrando, o artesão reivindica depois.
--
-- Idempotente: pode rodar de novo sem duplicar.
-- =====================================================================

INSERT INTO public.artisans
  (slug, shop_name, headline, bio, city, state, verified, status, claim_code)
VALUES
  ('ana-lima', 'Ateliê Ana Lima',
   'Pedra-Sabão & Cerâmica',
   'Quinta geração de uma família de artesãos de Ouro Preto. Trabalha a pedra-sabão extraída na região e assina cada peça na base.',
   'Ouro Preto', 'MG', TRUE, 'active', 'ANA-LIMA-2026'),

  ('maria-souza', 'Fibras de Maria',
   'Macramê & Fibras Naturais',
   'Aprendeu a trançar com a avó no Agreste pernambucano. Usa algodão cru e fibras de caroá tingidas com pigmentos naturais.',
   'Caruaru', 'PE', TRUE, 'active', 'MARIA-SOUZA-2026'),

  ('joao-neto', 'Madeira do João',
   'Escultura em Madeira',
   'Esculpe em madeira de reaproveitamento recolhida às margens do Tocantins. Cada peça leva de duas a seis semanas.',
   'Palmas', 'TO', FALSE, 'active', 'JOAO-NETO-2026')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- Peças
--
-- `stock_mode = 'unique'` para as esculturas e peças assinadas (some do
-- ar ao vender), `quantity` para o que o artesão reproduz.
-- ---------------------------------------------------------------------
WITH dados(slug, artisan_slug, category_slug, title, description,
           price_cents, compare_at_cents, stock_mode, stock_quantity,
           featured, imagem, tint) AS (
  VALUES
    ('caixa-pedra-sabao', 'ana-lima', 'pedra-sabao',
     'Caixas de Pedra-Sabão',
     'Conjunto de caixas torneadas à mão em pedra-sabão de Ouro Preto, com tampa ajustada peça a peça.',
     12900, NULL, 'unique', 1, TRUE, 'stone', '#8C6744'),

    ('peca-macrame', 'maria-souza', 'macrame',
     'Peça de Macramê',
     'Painel de parede em algodão cru, trançado em nós tradicionais do Agreste. Cerca de 90 cm de altura.',
     8500, 11000, 'quantity', 6, FALSE, 'weave', '#9A6E44'),

    ('escultura-madeira', 'joao-neto', 'madeira',
     'Escultura em Madeira',
     'Escultura entalhada em madeira de reaproveitamento, acabamento em óleo vegetal. Peça única.',
     21000, NULL, 'unique', 1, FALSE, 'wood', '#845A35'),

    ('trancado-buriti', 'joao-neto', 'palha',
     'Trançado de Buriti',
     'Trançado em fibra de buriti colhida e seca ao sol, técnica aprendida com as comunidades ribeirinhas.',
     6500, NULL, 'quantity', 12, FALSE, 'straw1', '#CC914B'),

    ('vaso-ceramica', 'ana-lima', 'ceramica',
     'Vaso de Cerâmica',
     'Vaso torneado e queimado em forno a lenha, esmalte cinza-terra desenvolvido no ateliê.',
     17500, NULL, 'quantity', 8, TRUE, 'pottery', '#826549'),

    ('barro-rustico', 'ana-lima', 'barro',
     'Peças de Barro Rústico',
     'Trio de peças em barro sem esmalte, com marcas do torno preservadas propositalmente.',
     9500, NULL, 'quantity', 10, FALSE, 'ceramic', '#9B5F36'),

    ('cestos-trancados', 'maria-souza', 'cestos',
     'Cestos Trançados',
     'Cestos em fibra natural com base reforçada, três tamanhos encaixáveis.',
     5800, NULL, 'quantity', 15, FALSE, 'basket', '#815F51'),

    ('cesta-palha', 'maria-souza', 'tecidos',
     'Cesta de Palha',
     'Cesta de palha trançada com alça em couro vegetal, costurada à mão.',
     14500, NULL, 'quantity', 4, FALSE, 'straw2', '#B8864A')
)
INSERT INTO public.products
  (artisan_id, category_id, slug, title, description, price_cents,
   compare_at_price_cents, stock_mode, stock_quantity, status, featured)
SELECT a.id, c.id, d.slug, d.title, d.description, d.price_cents,
       d.compare_at_cents, d.stock_mode::public.stock_mode, d.stock_quantity,
       'active', d.featured
FROM dados d
JOIN public.artisans  a ON a.slug = d.artisan_slug
LEFT JOIN public.categories c ON c.slug = d.category_slug
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- Imagens
--
-- `seed/<chave>.jpg` sinaliza para o front usar o arquivo empacotado em
-- src/assets. Quando o artesão subir foto de verdade pelo painel, o
-- caminho passa a ser {artisan_id}/... no bucket `produtos` e o front
-- resolve pela URL pública do Storage. Ver resolverImagem() em
-- src/lib/catalogo.ts.
-- ---------------------------------------------------------------------
WITH imagens(product_slug, imagem, tint) AS (
  VALUES
    ('caixa-pedra-sabao', 'stone',   '#8C6744'),
    ('peca-macrame',      'weave',   '#9A6E44'),
    ('escultura-madeira', 'wood',    '#845A35'),
    ('trancado-buriti',   'straw1',  '#CC914B'),
    ('vaso-ceramica',     'pottery', '#826549'),
    ('barro-rustico',     'ceramic', '#9B5F36'),
    ('cestos-trancados',  'basket',  '#815F51'),
    ('cesta-palha',       'straw2',  '#B8864A')
)
INSERT INTO public.product_images (product_id, storage_path, alt, tint, position)
SELECT p.id, 'seed/' || i.imagem || '.jpg', p.title, i.tint, 0
FROM imagens i
JOIN public.products p ON p.slug = i.product_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id
);

-- Foto de capa/avatar das lojas, mesma convenção
UPDATE public.artisans SET avatar_url = 'seed/ceramic.jpg', cover_url = 'seed/pottery.jpg'
  WHERE slug = 'ana-lima'    AND avatar_url IS NULL;
UPDATE public.artisans SET avatar_url = 'seed/weave.jpg',   cover_url = 'seed/basket.jpg'
  WHERE slug = 'maria-souza' AND avatar_url IS NULL;
UPDATE public.artisans SET avatar_url = 'seed/wood.jpg',    cover_url = 'seed/straw1.jpg'
  WHERE slug = 'joao-neto'   AND avatar_url IS NULL;

-- ---------------------------------------------------------------------
-- Experiências
-- ---------------------------------------------------------------------
WITH dados(slug, artisan_slug, title, description, kind, price_cents,
           duration, starts_em_dias, capacity, location, imagem, tint, featured) AS (
  VALUES
    ('torneamento-em-barro', 'ana-lima',
     'Torneamento em Barro: do Bloco à Peça',
     'Uma manhã inteira aprendendo a girar o torno e dar forma ao barro como há cinco gerações em Ouro Preto.',
     'live', 8900, 120, 21, 12, 'Ouro Preto, MG', 'pottery', '#826549', TRUE),

    ('macrame-essencial', 'maria-souza',
     'Macramê Essencial: 6 Pontos para Sempre',
     'Cinco módulos gravados cobrindo os nós que sustentam qualquer peça de macramê.',
     'recorded', 6500, 300, NULL, NULL, NULL, 'weave', '#9A6E44', FALSE),

    ('entalhe-na-madeira', 'joao-neto',
     'Entalhe na Madeira: Primeiros Cortes',
     'Oficina presencial de entalhe, com ferramentas incluídas e uma peça para levar para casa.',
     'in_person', 15000, 240, 35, 8, 'Palmas, TO', 'wood', '#845A35', FALSE)
)
INSERT INTO public.experiences
  (artisan_id, slug, title, description, kind, price_cents, duration_minutes,
   starts_at, capacity, location, cover_path, cover_tint, status, featured)
SELECT a.id, d.slug, d.title, d.description, d.kind::public.experience_kind,
       d.price_cents, d.duration,
       CASE WHEN d.starts_em_dias IS NULL THEN NULL
            ELSE now() + (d.starts_em_dias || ' days')::INTERVAL END,
       d.capacity, d.location,
       'seed/' || d.imagem || '.jpg', d.tint, 'active', d.featured
FROM dados d
JOIN public.artisans a ON a.slug = d.artisan_slug
ON CONFLICT (slug) DO NOTHING;
