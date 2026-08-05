-- =====================================================================
-- 4/5 — Avaliações vinculadas à compra e mensagens
--
-- A tabela `reviews` atual permite que qualquer usuário autenticado
-- avalie qualquer artesão, com qualquer nome, sem ter comprado — e o
-- artesão pode apagar avaliação ruim do próprio perfil. Num marketplace
-- a reputação é o ativo; isso precisa ser fechado.
-- =====================================================================

-- Preserva o que existe (dados de demonstração) em vez de apagar.
ALTER TABLE public.reviews RENAME TO reviews_legacy;
ALTER TABLE public.reviews_legacy DISABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.reviews_legacy IS
  'Avaliações do protótipo, sem vínculo com compra. Manter só para consulta; remover quando não for mais necessária.';

CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- o vínculo com o item comprado é o que garante avaliação verificada
  order_item_id UUID NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE CASCADE,
  artisan_id    UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  experience_id UUID REFERENCES public.experiences(id) ON DELETE SET NULL,
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT CHECK (comment IS NULL OR length(comment) <= 2000),
  -- resposta pública do artesão: ele pode responder, não apagar
  artisan_reply TEXT CHECK (artisan_reply IS NULL OR length(artisan_reply) <= 2000),
  replied_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reviews_artisan_idx ON public.reviews (artisan_id, created_at DESC);
CREATE INDEX reviews_product_idx ON public.reviews (product_id);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações são públicas"
  ON public.reviews FOR SELECT USING (TRUE);

-- Só quem comprou aquele item, e só depois de entregue.
CREATE OR REPLACE FUNCTION public.pode_avaliar(_order_item_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = _order_item_id
      AND o.buyer_user_id = auth.uid()
      AND o.status = 'delivered'
  );
$$;

GRANT EXECUTE ON FUNCTION public.pode_avaliar(UUID) TO authenticated;

CREATE POLICY "Só quem comprou e recebeu avalia"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.pode_avaliar(order_item_id));

CREATE POLICY "Autor edita a própria avaliação"
  ON public.reviews FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Autor apaga a própria avaliação"
  ON public.reviews FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin());

-- O artesão responde, mas não altera nota nem comentário: a checagem
-- fica no trigger, porque RLS não compara coluna a coluna.
CREATE OR REPLACE FUNCTION public.artesao_so_responde()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.author_id AND NOT public.is_admin() THEN
    IF NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.comment IS DISTINCT FROM OLD.comment THEN
      RAISE EXCEPTION 'O artesão pode responder, mas não alterar a avaliação';
    END IF;
    IF NEW.artisan_reply IS DISTINCT FROM OLD.artisan_reply THEN
      NEW.replied_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_artesao_so_responde
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.artesao_so_responde();

REVOKE EXECUTE ON FUNCTION public.artesao_so_responde() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Artesão responde avaliação da própria loja"
  ON public.reviews FOR UPDATE TO authenticated
  USING (public.owns_artisan(artisan_id))
  WITH CHECK (public.owns_artisan(artisan_id));

-- Média e contagem por artesão, sem N+1 no front.
CREATE OR REPLACE VIEW public.artisan_ratings
WITH (security_invoker = TRUE) AS
  SELECT artisan_id,
         ROUND(AVG(rating)::NUMERIC, 1) AS average_rating,
         COUNT(*)                       AS review_count
  FROM public.reviews
  GROUP BY artisan_id;

GRANT SELECT ON public.artisan_ratings TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Mensagens (a tela de chat já existe no front, com dados fictícios)
-- ---------------------------------------------------------------------
CREATE TABLE public.conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id      UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  buyer_user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (artisan_id, buyer_user_id, product_id)
);

CREATE INDEX conversations_artisan_idx ON public.conversations (artisan_id, last_message_at DESC);
CREATE INDEX conversations_buyer_idx   ON public.conversations (buyer_user_id, last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.participa_da_conversa(_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    LEFT JOIN public.artisans a ON a.id = c.artisan_id
    WHERE c.id = _conversation_id
      AND (c.buyer_user_id = auth.uid() OR a.user_id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.participa_da_conversa(UUID) TO authenticated;

CREATE POLICY "Participantes veem a conversa"
  ON public.conversations FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid() OR public.owns_artisan(artisan_id));

CREATE POLICY "Comprador abre conversa"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes leem as mensagens"
  ON public.messages FOR SELECT TO authenticated
  USING (public.participa_da_conversa(conversation_id));

CREATE POLICY "Participantes enviam mensagem"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.participa_da_conversa(conversation_id));

CREATE POLICY "Participantes marcam como lida"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.participa_da_conversa(conversation_id))
  WITH CHECK (public.participa_da_conversa(conversation_id));

CREATE OR REPLACE FUNCTION public.atualizar_ultima_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_atualiza_conversa
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_ultima_mensagem();

REVOKE EXECUTE ON FUNCTION public.atualizar_ultima_mensagem() FROM PUBLIC, anon, authenticated;
