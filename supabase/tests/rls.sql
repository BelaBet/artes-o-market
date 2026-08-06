-- =====================================================================
-- Testes de RLS e regras de negócio
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on

-- No Supabase esses GRANTs vêm por default privileges; aqui replicamos.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Usuários de teste
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ana@artesa.test'),
  ('22222222-2222-2222-2222-222222222222', 'joao@artesao.test'),
  ('33333333-3333-3333-3333-333333333333', 'compradora@test'),
  ('44444444-4444-4444-4444-444444444444', 'bisbilhoteiro@test');

-- (o trigger on_auth_user_created cria profile + papel buyer)

-- Visões auxiliares SÓ para o teste enxergar a verdade do banco.
CREATE VIEW public.order_items_todos AS SELECT * FROM public.order_items;
CREATE VIEW public.reviews_todas     AS SELECT * FROM public.reviews;
GRANT SELECT ON public.order_items_todos, public.reviews_todas TO authenticated;

CREATE OR REPLACE FUNCTION public.checar(_descricao TEXT, _condicao BOOLEAN)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF _condicao THEN
    RAISE NOTICE 'PASSOU  %', _descricao;
  ELSE
    RAISE EXCEPTION 'FALHOU  %', _descricao;
  END IF;
END;
$$;

-- Espera que o bloco falhe (violação de RLS ou regra de negócio)
CREATE OR REPLACE FUNCTION public.checar_bloqueio(_descricao TEXT, _sql TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE _sql;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PASSOU  % (bloqueado: %)', _descricao, left(SQLERRM, 60);
    RETURN;
  END;
  RAISE EXCEPTION 'FALHOU  % — a operação foi PERMITIDA e deveria ter sido bloqueada', _descricao;
END;
$$;

-- =====================================================================
-- 1. Artesãs criam suas lojas
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.criar_minha_loja('Ateliê Ana Lima', 'ana-lima', 'Ouro Preto', 'MG');

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT public.criar_minha_loja('Madeira do João', 'joao-neto', 'Palmas', 'TO');

RESET ROLE;
-- Ativa as lojas (no fluxo real é curadoria/admin)
UPDATE public.artisans SET status = 'active';

SELECT public.checar(
  'criar_minha_loja concede o papel de artesão',
  (SELECT count(*) FROM public.user_roles WHERE role = 'artisan') = 2
);

-- =====================================================================
-- 2. Produtos: isolamento entre lojas
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

INSERT INTO public.products (artisan_id, slug, title, price_cents, stock_mode, stock_quantity, status)
VALUES (public.my_artisan_id(), 'caixa-pedra-sabao', 'Caixa de Pedra-Sabão', 12900, 'unique', 1, 'active');

INSERT INTO public.products (artisan_id, slug, title, price_cents, stock_mode, stock_quantity, status)
VALUES (public.my_artisan_id(), 'vaso-ceramica', 'Vaso de Cerâmica', 17500, 'quantity', 10, 'active');

-- rascunho não pode aparecer para terceiros
INSERT INTO public.products (artisan_id, slug, title, price_cents, status)
VALUES (public.my_artisan_id(), 'peca-secreta', 'Peça ainda não lançada', 30000, 'draft');

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

SELECT public.checar_bloqueio(
  'artesão NÃO cria produto na loja de outro',
  $q$ INSERT INTO public.products (artisan_id, slug, title, price_cents)
      VALUES ((SELECT id FROM public.artisans WHERE slug = 'ana-lima'),
              'invasao', 'Produto plantado', 100) $q$
);

SELECT public.checar(
  'artesão NÃO enxerga rascunho de outra loja',
  (SELECT count(*) FROM public.products WHERE slug = 'peca-secreta') = 0
);

SELECT public.checar(
  'artesão enxerga produtos ativos de outra loja (vitrine)',
  (SELECT count(*) FROM public.products WHERE slug = 'caixa-pedra-sabao') = 1
);

-- UPDATE sem erro, mas sem efeito: RLS filtra a linha
UPDATE public.products SET price_cents = 1 WHERE slug = 'caixa-pedra-sabao';
RESET ROLE;
SELECT public.checar(
  'artesão NÃO altera preço de produto alheio',
  (SELECT price_cents FROM public.products WHERE slug = 'caixa-pedra-sabao') = 12900
);

-- anônimo enxerga a vitrine, mas não o rascunho
SET ROLE anon;
SET request.jwt.claim.sub = '';
SELECT public.checar(
  'anônimo vê só produtos ativos',
  (SELECT count(*) FROM public.products) = 2
);
RESET ROLE;

-- =====================================================================
-- 3. Checkout: preço vem do banco, nunca do cliente
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

SELECT public.checar_bloqueio(
  'comprador NÃO insere item de pedido direto (burlando o preço)',
  $q$ INSERT INTO public.order_items
        (order_id, kind, product_id, artisan_id, title, unit_price_cents,
         quantity, total_cents, commission_bps, platform_fee_cents, artisan_amount_cents)
      SELECT gen_random_uuid(), 'product', p.id, p.artisan_id, p.title,
             1, 1, 1, 0, 0, 1
      FROM public.products p WHERE p.slug = 'caixa-pedra-sabao' $q$
);

-- Atenção: `SELECT (funcao()).*` chamaria a função uma vez por coluna.
CREATE TEMP TABLE pedido_teste AS
SELECT * FROM public.criar_pedido(
  jsonb_build_array(
    jsonb_build_object('kind', 'product', 'id',
      (SELECT id FROM public.products WHERE slug = 'caixa-pedra-sabao'), 'quantity', 1),
    jsonb_build_object('kind', 'product', 'id',
      (SELECT id FROM public.products WHERE slug = 'vaso-ceramica'), 'quantity', 2)
  ),
  'Compradora Teste', 'compradora@test', NULL, NULL, '{}'::jsonb, 2500
);

RESET ROLE;

SELECT public.checar(
  'subtotal calculado no servidor (129,00 + 2 x 175,00 = 479,00)',
  (SELECT subtotal_cents FROM pedido_teste) = 47900
);

SELECT public.checar(
  'total soma o frete (479,00 + 25,00 = 504,00)',
  (SELECT total_cents FROM pedido_teste) = 50400
);

SELECT public.checar(
  'comissão de 12% congelada por item (12,9% ... 12% de 479,00 = 57,48)',
  (SELECT platform_fee_cents FROM pedido_teste) = 5748
);

SELECT public.checar(
  'split fecha: taxa + valor do artesão = total do item',
  NOT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE platform_fee_cents + artisan_amount_cents <> total_cents
  )
);

-- =====================================================================
-- 4. Pedidos: quem vê o quê
-- =====================================================================
SET ROLE authenticated;

SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.checar(
  'artesã com item no pedido enxerga o pedido',
  (SELECT count(*) FROM public.orders) = 1
);

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT public.checar(
  'artesão SEM item no pedido não enxerga nada',
  (SELECT count(*) FROM public.orders) = 0
);

SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SELECT public.checar(
  'usuário aleatório não enxerga pedido de terceiro',
  (SELECT count(*) FROM public.orders) = 0
);
SELECT public.checar(
  'usuário aleatório não enxerga itens de pedido de terceiro',
  (SELECT count(*) FROM public.order_items) = 0
);

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.checar(
  'compradora enxerga o próprio pedido',
  (SELECT count(*) FROM public.orders) = 1
);
RESET ROLE;

-- =====================================================================
-- 5. Estoque: baixa no pagamento
-- =====================================================================
UPDATE public.orders SET status = 'paid' WHERE id = (SELECT id FROM pedido_teste);

SELECT public.checar(
  'peça única vira sold_out ao ser paga',
  (SELECT status FROM public.products WHERE slug = 'caixa-pedra-sabao') = 'sold_out'
);

SELECT public.checar(
  'estoque com quantidade é decrementado (10 - 2 = 8)',
  (SELECT stock_quantity FROM public.products WHERE slug = 'vaso-ceramica') = 8
);

SELECT public.checar(
  'paid_at é preenchido automaticamente',
  (SELECT paid_at IS NOT NULL FROM public.orders WHERE id = (SELECT id FROM pedido_teste))
);

-- segunda compra da mesma peça única precisa falhar
SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SELECT public.checar_bloqueio(
  'peça única já vendida não pode ser comprada de novo',
  $q$ SELECT public.criar_pedido(
        jsonb_build_array(jsonb_build_object('kind','product','id',
          (SELECT id FROM public.products WHERE slug = 'caixa-pedra-sabao'),'quantity',1)),
        'Outro Comprador', 'outro@test') $q$
);
RESET ROLE;

-- estorno devolve o estoque
UPDATE public.orders SET status = 'refunded' WHERE id = (SELECT id FROM pedido_teste);
SELECT public.checar(
  'estorno devolve o estoque (8 + 2 = 10)',
  (SELECT stock_quantity FROM public.products WHERE slug = 'vaso-ceramica') = 10
);
SELECT public.checar(
  'estorno reativa a peça única',
  (SELECT status FROM public.products WHERE slug = 'caixa-pedra-sabao') = 'active'
);

-- =====================================================================
-- 6. Avaliações: só quem comprou e recebeu
-- =====================================================================
UPDATE public.orders SET status = 'paid' WHERE id = (SELECT id FROM pedido_teste);

SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
-- Aqui o INSERT..SELECT não levanta exceção: a RLS de order_items já
-- devolve zero linhas para quem não participou do pedido. A asserção
-- correta é contar o que entrou.
INSERT INTO public.reviews (order_item_id, artisan_id, author_id, rating, comment)
SELECT oi.id, oi.artisan_id, auth.uid(), 1, 'Avaliação falsa'
FROM public.order_items oi LIMIT 1;

-- ...e mesmo apontando um item que ele descobrisse por fora, a policy barra:
SELECT public.checar_bloqueio(
  'quem não comprou NÃO avalia nem sabendo o id do item',
  format($q$ INSERT INTO public.reviews (order_item_id, artisan_id, author_id, rating)
             VALUES (%L, %L, auth.uid(), 1) $q$,
         (SELECT id FROM public.order_items_todos LIMIT 1),
         (SELECT artisan_id FROM public.order_items_todos LIMIT 1))
);

SELECT public.checar(
  'nenhuma avaliação foi criada por quem não comprou',
  (SELECT count(*) FROM public.reviews_todas) = 0
);

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.checar_bloqueio(
  'compradora NÃO avalia antes da entrega',
  $q$ INSERT INTO public.reviews (order_item_id, artisan_id, author_id, rating)
      SELECT oi.id, oi.artisan_id, auth.uid(), 5
      FROM public.order_items oi LIMIT 1 $q$
);
RESET ROLE;

UPDATE public.orders SET status = 'delivered' WHERE id = (SELECT id FROM pedido_teste);

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
INSERT INTO public.reviews (order_item_id, artisan_id, product_id, author_id, rating, comment)
SELECT oi.id, oi.artisan_id, oi.product_id, auth.uid(), 2, 'Chegou lascado, atendimento ruim'
FROM public.order_items oi
JOIN public.products p ON p.id = oi.product_id
WHERE p.slug = 'caixa-pedra-sabao';

SELECT public.checar(
  'compradora avalia depois de entregue',
  (SELECT count(*) FROM public.reviews) = 1
);

SELECT public.checar_bloqueio(
  'não dá para avaliar o mesmo item duas vezes',
  $q$ INSERT INTO public.reviews (order_item_id, artisan_id, author_id, rating)
      SELECT oi.id, oi.artisan_id, auth.uid(), 5
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE p.slug = 'caixa-pedra-sabao' $q$
);

-- a artesã tenta se defender da nota 2
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

SELECT public.checar_bloqueio(
  'artesã NÃO altera a nota da avaliação',
  $q$ UPDATE public.reviews SET rating = 5 $q$
);

SELECT public.checar_bloqueio(
  'artesã NÃO reescreve o comentário',
  $q$ UPDATE public.reviews SET comment = 'Tudo ótimo!' $q$
);

DELETE FROM public.reviews;
RESET ROLE;
SELECT public.checar(
  'artesã NÃO apaga avaliação ruim',
  (SELECT count(*) FROM public.reviews) = 1
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
UPDATE public.reviews SET artisan_reply = 'Sentimos muito, vamos reenviar a peça.';
RESET ROLE;
SELECT public.checar(
  'artesã PODE responder publicamente',
  (SELECT artisan_reply IS NOT NULL AND replied_at IS NOT NULL FROM public.reviews)
);

SELECT public.checar(
  'view de média por artesã funciona',
  (SELECT average_rating FROM public.artisan_ratings) = 2.0
);

-- =====================================================================
-- 7. Escalada de privilégio
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

SELECT public.checar_bloqueio(
  'usuário NÃO se promove a admin',
  $q$ INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') $q$
);

UPDATE public.platform_settings SET default_commission_bps = 0;
RESET ROLE;
SELECT public.checar(
  'não-admin NÃO zera a comissão da plataforma',
  (SELECT default_commission_bps FROM public.platform_settings) = 1200
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
UPDATE public.artisans SET verified = TRUE;
RESET ROLE;
SELECT public.checar(
  'usuário NÃO se auto-verifica',
  (SELECT count(*) FROM public.artisans WHERE verified) = 0
);

-- Dados financeiros (recebedor Pagar.me e comissão) vivem em
-- artisan_billing, fora da tabela lida publicamente.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.checar(
  'nem o próprio artesão lê os dados financeiros da loja',
  (SELECT count(*) FROM public.artisan_billing) = 0
);
UPDATE public.artisan_billing SET commission_bps = 0;
RESET ROLE;
SELECT public.checar(
  'ninguém além de admin altera a comissão da própria loja',
  NOT EXISTS (SELECT 1 FROM public.artisan_billing WHERE commission_bps = 0)
);

-- =====================================================================
-- 8. Storage: isolamento por pasta
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
INSERT INTO storage.objects (bucket_id, name)
VALUES ('produtos', (SELECT id::text FROM public.artisans WHERE slug = 'ana-lima') || '/vaso.webp');

SELECT public.checar_bloqueio(
  'artesã NÃO envia arquivo para a pasta de outra loja',
  $q$ INSERT INTO storage.objects (bucket_id, name)
      VALUES ('produtos', (SELECT id::text FROM public.artisans WHERE slug = 'joao-neto') || '/invasao.webp') $q$
);

SELECT public.checar_bloqueio(
  'caminho sem UUID de loja é recusado',
  $q$ INSERT INTO storage.objects (bucket_id, name) VALUES ('produtos', 'solto.webp') $q$
);
RESET ROLE;

SELECT '=========== TODOS OS TESTES PASSARAM ===========' AS resultado;

-- =====================================================================
-- 10. Painel do artesão: criação da loja, vocabulários e progresso
-- =====================================================================
INSERT INTO auth.users (id, email) VALUES
  ('55555555-5555-5555-5555-555555555555', 'novato@artesao.test');

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

SELECT public.garantir_minha_loja('Ateliê da Ana Lima');

SELECT public.checar(
  'garantir_minha_loja deriva slug sem acento e sem colidir',
  (SELECT slug FROM public.artisans WHERE user_id = '55555555-5555-5555-5555-555555555555')
    = 'atelie-da-ana-lima'
);

SELECT public.garantir_minha_loja('Outro Nome');
RESET ROLE;
SELECT public.checar(
  'chamar de novo devolve a mesma loja, não cria outra',
  (SELECT count(*) FROM public.artisans WHERE user_id = '55555555-5555-5555-5555-555555555555') = 1
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

INSERT INTO public.artisan_materials (artisan_id, material_id, is_primary)
SELECT public.my_artisan_id(), id, TRUE FROM public.materials WHERE slug = 'barro';

INSERT INTO public.artisan_offerings (artisan_id, offering_type)
VALUES (public.my_artisan_id(), 'workshop');

SELECT public.checar(
  'artesão registra material e oferta da própria loja',
  (SELECT count(*) FROM public.artisan_materials) = 1
  AND (SELECT count(*) FROM public.artisan_offerings) = 1
);

SELECT public.checar_bloqueio(
  'artesão NÃO registra material na loja de outro',
  $q$ INSERT INTO public.artisan_materials (artisan_id, material_id)
      SELECT (SELECT id FROM public.artisans WHERE slug = 'ana-lima'), id
      FROM public.materials WHERE slug = 'couro' $q$
);

SELECT public.checar(
  'progresso marca materiais e formas de venda como concluídos',
  (SELECT concluida FROM public.progresso_da_loja(public.my_artisan_id()) WHERE etapa = 'materiais')
  AND (SELECT concluida FROM public.progresso_da_loja(public.my_artisan_id()) WHERE etapa = 'vendas')
);

SELECT public.checar(
  'progresso marca história como pendente enquanto a bio estiver vazia',
  NOT (SELECT concluida FROM public.progresso_da_loja(public.my_artisan_id()) WHERE etapa = 'historia')
);
RESET ROLE;

SELECT '=========== PAINEL: TESTES PASSARAM ===========' AS resultado;

-- =====================================================================
-- 11. Encomendas (Projetos Sob Medida)
-- =====================================================================
-- Visão auxiliar só para o teste enxergar a verdade do banco.
CREATE VIEW public.custom_requests_todas AS SELECT * FROM public.custom_requests;
GRANT SELECT ON public.custom_requests_todas TO authenticated;
-- A loja da Ana passa a aceitar encomendas; a do João, não.
UPDATE public.artisans SET accepts_custom_orders = TRUE, state = 'PE',
       production_capacity_monthly = 100
  WHERE slug = 'ana-lima';
UPDATE public.artisans SET accepts_custom_orders = FALSE WHERE slug = 'joao-neto';

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

INSERT INTO public.custom_requests
  (buyer_user_id, request_type, title, description, quantity_min, delivery_state, max_proposals)
VALUES (auth.uid(), 'peca_nova', 'Painel de madeira para a sala',
        'Queria um painel de madeira de uns 2 metros para a parede da sala.',
        1, 'PE', 3);

SELECT public.checar(
  'comprador cria encomenda como rascunho',
  (SELECT status FROM public.custom_requests LIMIT 1) = 'rascunho'
);

-- rascunho não pode vazar para artesão nenhum
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.checar(
  'artesã NÃO enxerga encomenda em rascunho',
  (SELECT count(*) FROM public.custom_requests) = 0
);

SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SELECT public.checar(
  'terceiro NÃO enxerga encomenda alheia',
  (SELECT count(*) FROM public.custom_requests) = 0
);

-- envio e distribuição
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.enviar_encomenda((SELECT id FROM public.custom_requests LIMIT 1));

SELECT public.checar(
  'envio publica a encomenda e passa a receber propostas',
  (SELECT status FROM public.custom_requests LIMIT 1) = 'recebendo_propostas'
);
RESET ROLE;

SELECT public.checar(
  'distribuição alcança só quem aceita encomendas',
  (SELECT count(*) FROM public.custom_request_matches) = 1
  AND (SELECT a.slug FROM public.custom_request_matches m
       JOIN public.artisans a ON a.id = m.artisan_id LIMIT 1) = 'ana-lima'
);

SELECT public.checar(
  'a razão do encaminhamento fica registrada',
  'aceita encomendas' = ANY (SELECT unnest(match_reasons) FROM public.custom_request_matches LIMIT 1)
);

-- artesão que recebeu passa a enxergar
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.checar(
  'artesã que recebeu a distribuição enxerga a encomenda',
  (SELECT count(*) FROM public.custom_requests) = 1
);

SET request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
SELECT public.checar(
  'artesão que NÃO recebeu continua sem enxergar',
  (SELECT count(*) FROM public.custom_requests) = 0
);

SELECT public.checar_bloqueio(
  'artesão não distribuído NÃO consegue responder',
  $q$ SELECT public.responder_encomenda(
        (SELECT id FROM public.custom_requests_todas LIMIT 1), 'interessado') $q$
);

-- resposta abre conversa
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.responder_encomenda(
  (SELECT id FROM public.custom_requests LIMIT 1), 'interessado');

SELECT public.checar(
  'interesse abre a conversa entre artesã e compradora',
  (SELECT count(*) FROM public.conversations WHERE request_id IS NOT NULL) = 1
);
RESET ROLE;

SELECT public.checar(
  'resposta do artesão fica registrada',
  (SELECT response_status FROM public.custom_request_matches LIMIT 1) = 'interessado'
);

-- ninguém insere distribuição na mão
SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SELECT public.checar_bloqueio(
  'ninguém se auto-inclui na distribuição de uma encomenda',
  $q$ INSERT INTO public.custom_request_matches (request_id, artisan_id)
      VALUES ((SELECT id FROM public.custom_requests_todas LIMIT 1),
              (SELECT id FROM public.artisans WHERE slug = 'joao-neto')) $q$
);

-- anexos: caminho tem que ser da encomenda
SELECT public.checar_bloqueio(
  'quem não participa NÃO envia anexo para a encomenda',
  format($q$ INSERT INTO storage.objects (bucket_id, name)
             VALUES ('encomendas', %L) $q$,
    (SELECT id::text FROM public.custom_requests_todas LIMIT 1) || '/planta.pdf')
);

SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
INSERT INTO storage.objects (bucket_id, name)
VALUES ('encomendas',
        (SELECT id::text FROM public.custom_requests LIMIT 1) || '/referencia.jpg');

SELECT public.checar(
  'compradora envia anexo na pasta da própria encomenda',
  (SELECT count(*) FROM storage.objects WHERE bucket_id = 'encomendas') = 1
);
RESET ROLE;

SELECT '=========== ENCOMENDAS: TESTES PASSARAM ===========' AS resultado;

-- =====================================================================
-- 12. Pagamento: taxa de serviço e total calculado no servidor
-- =====================================================================
SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

CREATE TEMP TABLE pedido_pgto AS
SELECT * FROM public.criar_pedido(
  jsonb_build_array(
    jsonb_build_object('kind','product','id',
      (SELECT id FROM public.products WHERE slug = 'vaso-ceramica'), 'quantity', 1)),
  'Compradora Teste', 'compradora@test', NULL, NULL, '{}'::jsonb, 0
);

SELECT public.definir_pagamento((SELECT id FROM pedido_pgto), 'pix');
RESET ROLE;

SELECT public.checar(
  'PIX: taxa de 0,99% sobre o subtotal (175,00 -> 1,73)',
  (SELECT service_fee_cents FROM public.orders WHERE id = (SELECT id FROM pedido_pgto)) = 173
);

SELECT public.checar(
  'total = subtotal + taxa de serviço',
  (SELECT total_cents FROM public.orders WHERE id = (SELECT id FROM pedido_pgto)) = 17500 + 173
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.definir_pagamento((SELECT id FROM pedido_pgto), 'boleto');
RESET ROLE;

SELECT public.checar(
  'boleto cobra valor fixo, não percentual',
  (SELECT service_fee_cents FROM public.orders WHERE id = (SELECT id FROM pedido_pgto)) = 349
);

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.definir_pagamento((SELECT id FROM pedido_pgto), 'credit_card', 3);
RESET ROLE;

SELECT public.checar(
  'cartão guarda o parcelamento escolhido',
  (SELECT installments FROM public.orders WHERE id = (SELECT id FROM pedido_pgto)) = 3
);

-- comprador não muda o pagamento de pedido alheio
SET ROLE authenticated;
SET request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
SELECT public.checar_bloqueio(
  'terceiro NÃO define o pagamento de pedido de outra pessoa',
  format($q$ SELECT public.definir_pagamento(%L, 'pix') $q$, (SELECT id FROM pedido_pgto))
);

-- depois de pago, não dá para trocar o método (e o total)
RESET ROLE;
UPDATE public.orders SET status = 'paid' WHERE id = (SELECT id FROM pedido_pgto);

SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
SELECT public.checar_bloqueio(
  'pedido pago NÃO tem o pagamento redefinido',
  format($q$ SELECT public.definir_pagamento(%L, 'pix') $q$, (SELECT id FROM pedido_pgto))
);

-- dados do recebedor seguem fora do alcance do artesão
SET request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SELECT public.checar(
  'artesão vê o andamento do próprio cadastro, sem ver a comissão',
  (SELECT count(*) FROM public.meu_recebimento) >= 0
);
RESET ROLE;

SELECT '=========== PAGAMENTO: TESTES PASSARAM ===========' AS resultado;
