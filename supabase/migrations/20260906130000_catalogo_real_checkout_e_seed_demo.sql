-- =====================================================================
-- Catálogo real + checkout: config obrigatória, bucket de imagens e
-- dados de demonstração.
--
-- POR QUE ESTE ARQUIVO EXISTE
-- Até aqui o front-end usava dados fictícios embutidos no código
-- (src/lib/data.ts): produtos, pedidos, mensagens e avaliações nunca
-- vieram do banco. Esta migration prepara o banco para servir dados de
-- verdade e populamos com um catálogo de demonstração (mesmas peças e
-- artesãos que já apareciam na versão estática) para a vitrine não
-- ficar vazia enquanto artesãos reais ainda não cadastraram produtos.
--
-- Também corrige duas lacunas encontradas ao ligar o checkout de verdade:
--  1) `platform_settings` nunca tinha uma linha — sem ela, as funções
--     `comissao_bps`/`taxa_de_servico` retornam NULL e `criar_pedido`
--     falha (violação de NOT NULL em order_items).
--  2) `orders.number` e `custom_requests.number` são bigint NOT NULL
--     sem nenhum DEFAULT versionado — `criar_pedido` nunca preenche
--     essa coluna, então o INSERT falhava. Adicionamos sequences.
--
-- Tudo aqui é idempotente (IF NOT EXISTS / ON CONFLICT), seguro de
-- rodar de novo e sobre o banco atual.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Configuração da plataforma — obrigatória para o checkout existir
-- ---------------------------------------------------------------------
INSERT INTO public.platform_settings (id, default_commission_bps, support_email)
VALUES (true, 1200, 'contato@artesomarket.com.br')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2) Numeração de pedidos e encomendas — sem isto, criar_pedido() falha
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.orders_number_seq;
ALTER SEQUENCE public.orders_number_seq OWNED BY public.orders.number;
ALTER TABLE public.orders ALTER COLUMN number SET DEFAULT nextval('public.orders_number_seq');
SELECT setval('public.orders_number_seq', GREATEST((SELECT COALESCE(MAX(number), 0) FROM public.orders), 1000));

CREATE SEQUENCE IF NOT EXISTS public.custom_requests_number_seq;
ALTER SEQUENCE public.custom_requests_number_seq OWNED BY public.custom_requests.number;
ALTER TABLE public.custom_requests ALTER COLUMN number SET DEFAULT nextval('public.custom_requests_number_seq');
SELECT setval('public.custom_requests_number_seq', GREATEST((SELECT COALESCE(MAX(number), 0) FROM public.custom_requests), 1000));

-- ---------------------------------------------------------------------
-- 3) Bucket de imagens ("lojas") — já em uso pelo painel (CampoFoto,
--    em src/components/painel/campos.tsx) para fotos de loja, mas nunca
--    tinha sido versionado. Reaproveitado aqui para fotos de produto,
--    na pasta "<artisan_id>/produtos/...".
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lojas', 'lojas', true, 5242880)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Fotos de loja são públicas" ON storage.objects;
CREATE POLICY "Fotos de loja são públicas" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'lojas');

DROP POLICY IF EXISTS "Artesão envia arquivo na própria pasta" ON storage.objects;
CREATE POLICY "Artesão envia arquivo na própria pasta" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lojas' AND public.caminho_e_da_minha_loja(name));

DROP POLICY IF EXISTS "Artesão atualiza arquivo na própria pasta" ON storage.objects;
CREATE POLICY "Artesão atualiza arquivo na própria pasta" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lojas' AND public.caminho_e_da_minha_loja(name))
  WITH CHECK (bucket_id = 'lojas' AND public.caminho_e_da_minha_loja(name));

DROP POLICY IF EXISTS "Artesão remove arquivo na própria pasta" ON storage.objects;
CREATE POLICY "Artesão remove arquivo na própria pasta" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lojas' AND public.caminho_e_da_minha_loja(name));

-- ---------------------------------------------------------------------
-- 4) Categorias
-- ---------------------------------------------------------------------
INSERT INTO public.categories (slug, name, position) VALUES
  ('pedra-sabao', 'Pedra-Sabão', 1),
  ('macrame',     'Macramê',     2),
  ('madeira',     'Madeira',     3),
  ('palha',       'Palha',       4),
  ('ceramica',    'Cerâmica',    5),
  ('barro',       'Barro',       6),
  ('cestos',      'Cestos',      7),
  ('tecidos',     'Tecidos',     8)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------
-- 5) Artesãos de demonstração
--
-- Usam contas de autenticação "de vitrine" (sem senha — não fazem
-- login) só para satisfazer a FK artisans.user_id -> auth.users, do
-- mesmo jeito que supabase/tests/rls.sql já faz para testes. São fáceis
-- de identificar e remover antes de um lançamento com artesãos reais:
-- todos usam e-mail terminado em "@demo.artesomarket.app".
-- ---------------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'ana.lima@demo.artesomarket.app'),
  ('a0000000-0000-4000-8000-000000000002', 'maria.souza@demo.artesomarket.app'),
  ('a0000000-0000-4000-8000-000000000003', 'joao.neto@demo.artesomarket.app')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.artisans (
  id, user_id, slug, shop_name, public_name, headline, bio, city, state,
  avatar_url, cover_url, verified, status,
  accepts_custom_orders, ships_nationwide, has_ready_stock, sells_to_people,
  onboarding_completed_at
) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'ana-lima', 'Ateliê Ana Lima', 'Ana Lima', 'Pedra-Sabão & Cerâmica',
   'Ana trabalha com pedra-sabão e cerâmica há mais de 20 anos em Ouro Preto. Suas peças unem tradição mineira com design contemporâneo, cada uma esculpida e pintada à mão com tintas naturais.',
   'Ouro Preto', 'MG', '/demo/ceramic.jpg', '/demo/stone.jpg', true, 'active',
   true, true, true, true, now()),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002',
   'maria-souza', 'Fibras da Maria', 'Maria Souza', 'Macramê & Fibras Naturais',
   'Maria é mestre em macramê e fibras naturais, criando peças que transformam qualquer ambiente. Seu trabalho preserva técnicas tradicionais do Nordeste brasileiro.',
   'Caruaru', 'PE', '/demo/weave.jpg', '/demo/basket.jpg', true, 'active',
   true, true, true, true, now()),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'joao-neto', 'Madeira do João', 'João Neto', 'Escultura em Madeira',
   'João esculpe madeira desde criança, aprendendo com seu avô no Tocantins. Suas esculturas coloridas são reconhecidas internacionalmente pela originalidade e riqueza de detalhes.',
   'Palmas', 'TO', '/demo/wood.jpg', '/demo/straw1.jpg', false, 'active',
   false, true, true, true, now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'artisan'::public.app_role FROM public.artisans
WHERE id IN (
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000003'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 6) Produtos de demonstração + imagens
-- ---------------------------------------------------------------------
INSERT INTO public.products (id, artisan_id, category_id, slug, title, description, price_cents, compare_at_price_cents, stock_quantity, status, featured)
SELECT * FROM (VALUES
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.categories WHERE slug = 'pedra-sabao'),
   'caixas-de-pedra-sabao', 'Caixas de Pedra-Sabão', 'Caixa esculpida à mão em pedra-sabão, acabamento fosco. Ótima para joias ou como peça decorativa.', 12900, NULL, 14, 'active'::public.listing_status, true),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.categories WHERE slug = 'ceramica'),
   'vaso-de-ceramica', 'Vaso de Cerâmica', 'Vaso torneado à mão e queimado em forno a lenha, com esmalte artesanal.', 17500, NULL, 9, 'active'::public.listing_status, true),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, (SELECT id FROM public.categories WHERE slug = 'barro'),
   'pecas-de-barro-rustico', 'Peças de Barro Rústico', 'Conjunto de peças em barro rústico, queima tradicional a céu aberto.', 9500, NULL, 20, 'active'::public.listing_status, false),
  ('c0000000-0000-4000-8000-000000000004'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.categories WHERE slug = 'macrame'),
   'peca-de-macrame', 'Peça de Macramê', 'Painel de parede em macramê 100% algodão, nó por nó, feito à mão.', 8500, 11000, 11, 'active'::public.listing_status, false),
  ('c0000000-0000-4000-8000-000000000005'::uuid, 'b0000000-0000-4000-8000-000000000002'::uuid, (SELECT id FROM public.categories WHERE slug = 'cestos'),
   'cestos-trancados', 'Cestos Trançados', 'Cesto trançado à mão em fibra natural, ótimo para organização ou decoração.', 5800, NULL, 25, 'active'::public.listing_status, false),
  ('c0000000-0000-4000-8000-000000000006'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.categories WHERE slug = 'madeira'),
   'escultura-em-madeira', 'Escultura em Madeira', 'Escultura entalhada e pintada à mão, madeira de reflorestamento.', 21000, NULL, 4, 'active'::public.listing_status, true),
  ('c0000000-0000-4000-8000-000000000007'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.categories WHERE slug = 'palha'),
   'trancado-de-buriti', 'Trançado de Buriti', 'Peça trançada em palha de buriti, técnica tradicional do Tocantins.', 6500, NULL, 18, 'active'::public.listing_status, false),
  ('c0000000-0000-4000-8000-000000000008'::uuid, 'b0000000-0000-4000-8000-000000000003'::uuid, (SELECT id FROM public.categories WHERE slug = 'tecidos'),
   'cesta-de-palha', 'Cesta de Palha', 'Cesta grande trançada à mão, ideal para piquenique ou decoração.', 14500, NULL, 7, 'active'::public.listing_status, false)
) AS v(id, artisan_id, category_id, slug, title, description, price_cents, compare_at_price_cents, stock_quantity, status, featured)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.product_images (product_id, storage_path, alt, tint, position) VALUES
  ('c0000000-0000-4000-8000-000000000001', '/demo/stone.jpg',   'Caixas de Pedra-Sabão',   '#8C6744', 0),
  ('c0000000-0000-4000-8000-000000000002', '/demo/pottery.jpg', 'Vaso de Cerâmica',        '#826549', 0),
  ('c0000000-0000-4000-8000-000000000003', '/demo/ceramic.jpg', 'Peças de Barro Rústico',  '#9B5F36', 0),
  ('c0000000-0000-4000-8000-000000000004', '/demo/weave.jpg',   'Peça de Macramê',         '#9A6E44', 0),
  ('c0000000-0000-4000-8000-000000000005', '/demo/basket.jpg',  'Cestos Trançados',        '#815F51', 0),
  ('c0000000-0000-4000-8000-000000000006', '/demo/wood.jpg',    'Escultura em Madeira',    '#845A35', 0),
  ('c0000000-0000-4000-8000-000000000007', '/demo/straw1.jpg',  'Trançado de Buriti',      '#CC914B', 0),
  ('c0000000-0000-4000-8000-000000000008', '/demo/straw2.jpg',  'Cesta de Palha',          '#B8864A', 0)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 7) Experiências de demonstração
-- ---------------------------------------------------------------------
INSERT INTO public.experiences (id, artisan_id, slug, title, description, kind, price_cents, duration_minutes, location, cover_path, cover_tint, status, featured)
VALUES
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
   'oficina-de-pedra-sabao', 'Oficina de Pedra-Sabão', 'Aprenda a esculpir uma peça simples em pedra-sabão, do bloco bruto ao acabamento.', 'in_person', 18000, 180, 'Ouro Preto, MG', '/demo/stone.jpg', '#8C6744', 'active', true),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
   'vivencia-de-macrame', 'Vivência de Macramê', 'Uma tarde para aprender os nós básicos do macramê e sair com seu primeiro painel.', 'in_person', 15000, 150, 'Caruaru, PE', '/demo/weave.jpg', '#9A6E44', 'active', false),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003',
   'curso-de-escultura-em-madeira', 'Curso de Escultura em Madeira', 'Curso gravado, em módulos, sobre entalhe e acabamento de esculturas em madeira.', 'recorded', 24000, 240, NULL, '/demo/wood.jpg', '#845A35', 'active', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 8) Compradores de demonstração + pedidos pagos + avaliações reais
--
-- `reviews` exige um order_item de verdade (order_item_id é único e
-- NOT NULL). Em vez de inserir avaliações soltas, criamos um comprador,
-- um pedido já pago e o item correspondente para cada avaliação — o
-- mesmo caminho que um pedido de verdade percorre, só que sem passar
-- pelo Pagar.me. Isso também exercita a numeração de pedidos (item 2
-- acima) e os cálculos de comissão como um teste de fumaça.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  _seed RECORD;
  _order_id uuid;
  _item_id uuid;
  _bps INTEGER;
  _taxa INTEGER;
  _artisan_id uuid;
  _price_cents INTEGER;
  _title TEXT;
BEGIN
  FOR _seed IN
    SELECT * FROM (VALUES
      ('f0000000-0000-4000-8000-000000000001'::uuid, 'juliana.p@demo.artesomarket.app', 'Juliana P.',  'São Paulo',      'SP', 'c0000000-0000-4000-8000-000000000001'::uuid, 5::smallint, 'Peça incrível! A caixinha de pedra-sabão é ainda mais linda ao vivo. Embalagem impecável.'),
      ('f0000000-0000-4000-8000-000000000002'::uuid, 'roberto.m@demo.artesomarket.app', 'Roberto M.',  'Rio de Janeiro', 'RJ', 'c0000000-0000-4000-8000-000000000002'::uuid, 5::smallint, 'Presente perfeito para minha esposa. Trabalho artesanal de altíssima qualidade.'),
      ('f0000000-0000-4000-8000-000000000003'::uuid, 'carlos.t@demo.artesomarket.app',  'Carlos T.',   'Belo Horizonte', 'MG', 'c0000000-0000-4000-8000-000000000003'::uuid, 5::smallint, 'Compro sempre com a Ana. Qualidade incomparável e atendimento maravilhoso.'),
      ('f0000000-0000-4000-8000-000000000004'::uuid, 'fernanda.r@demo.artesomarket.app','Fernanda R.', 'Curitiba',       'PR', 'c0000000-0000-4000-8000-000000000004'::uuid, 5::smallint, 'O macramê ficou perfeito na minha sala! Peça única e cheia de personalidade.'),
      ('f0000000-0000-4000-8000-000000000005'::uuid, 'camila.s@demo.artesomarket.app',  'Camila S.',   'Salvador',       'BA', 'c0000000-0000-4000-8000-000000000005'::uuid, 5::smallint, 'Arte de verdade! Cada detalhe mostra o cuidado e a dedicação da artesã.'),
      ('f0000000-0000-4000-8000-000000000006'::uuid, 'felipe.a@demo.artesomarket.app',  'Felipe A.',   'Brasília',       'DF', 'c0000000-0000-4000-8000-000000000006'::uuid, 5::smallint, 'Escultura magnífica! O João tem um talento incrível com madeira.'),
      ('f0000000-0000-4000-8000-000000000007'::uuid, 'ana.b@demo.artesomarket.app',     'Ana B.',      'Recife',         'PE', 'c0000000-0000-4000-8000-000000000007'::uuid, 4::smallint, 'Peça linda e colorida. Ficou perfeita na estante da sala.')
    ) AS t(buyer_id, email, nome, cidade, uf, product_id, nota, texto)
  LOOP
    -- idempotência: se o comprador já existe, este seed já rodou
    CONTINUE WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = _seed.buyer_id);

    INSERT INTO auth.users (id, email) VALUES (_seed.buyer_id, _seed.email);
    UPDATE public.profiles SET display_name = _seed.nome, city = _seed.cidade, state = _seed.uf
      WHERE user_id = _seed.buyer_id;

    SELECT artisan_id, price_cents, title INTO _artisan_id, _price_cents, _title
      FROM public.products WHERE id = _seed.product_id;
    _bps := private.comissao_bps(_artisan_id);
    _taxa := (_price_cents * _bps) / 10000;

    INSERT INTO public.orders (
      buyer_user_id, buyer_email, buyer_name, status,
      subtotal_cents, total_cents, platform_fee_cents, payment_method, paid_at
    ) VALUES (
      _seed.buyer_id, _seed.email, _seed.nome, 'paid',
      _price_cents, _price_cents, _taxa, 'pix', now()
    ) RETURNING id INTO _order_id;

    INSERT INTO public.order_items (
      order_id, kind, product_id, artisan_id, title, unit_price_cents, quantity,
      total_cents, commission_bps, platform_fee_cents, artisan_amount_cents
    ) VALUES (
      _order_id, 'product', _seed.product_id, _artisan_id, _title, _price_cents, 1,
      _price_cents, _bps, _taxa, _price_cents - _taxa
    ) RETURNING id INTO _item_id;

    INSERT INTO public.reviews (order_item_id, artisan_id, product_id, author_id, rating, comment)
    VALUES (_item_id, _artisan_id, _seed.product_id, _seed.buyer_id, _seed.nota, _seed.texto);
  END LOOP;
END $$;
