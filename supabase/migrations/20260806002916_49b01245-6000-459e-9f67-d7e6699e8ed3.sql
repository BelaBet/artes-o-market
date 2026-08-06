-- 1) search_path fixo nas funções que não tinham
CREATE OR REPLACE FUNCTION public.unaccent_simples(_texto text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT translate(
    _texto,
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
  );
$$;

CREATE OR REPLACE FUNCTION public.gerar_slug(_texto text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from
    regexp_replace(lower(public.unaccent_simples(_texto)), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- 2) Avaliações: artesão só pode responder, nunca alterar dados do comprador
CREATE OR REPLACE FUNCTION public.artesao_so_responde()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM OLD.author_id AND NOT public.is_admin() THEN
    IF NEW.rating        IS DISTINCT FROM OLD.rating
       OR NEW.comment    IS DISTINCT FROM OLD.comment
       OR NEW.author_id  IS DISTINCT FROM OLD.author_id
       OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
       OR NEW.artisan_id IS DISTINCT FROM OLD.artisan_id
       OR NEW.product_id IS DISTINCT FROM OLD.product_id
       OR NEW.experience_id IS DISTINCT FROM OLD.experience_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'O artesão pode responder, mas não alterar a avaliação';
    END IF;
    IF NEW.artisan_reply IS DISTINCT FROM OLD.artisan_reply THEN
      NEW.replied_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- o autor da avaliação não pode alterar a resposta do artesão
CREATE OR REPLACE FUNCTION public.autor_nao_altera_resposta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.author_id AND NOT public.is_admin() THEN
    NEW.artisan_reply := OLD.artisan_reply;
    NEW.replied_at    := OLD.replied_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_autor_nao_altera_resposta ON public.reviews;
CREATE TRIGGER reviews_autor_nao_altera_resposta
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.autor_nao_altera_resposta();

-- 3) Revogar EXECUTE de funções internas (gatilhos e utilitários não usados em políticas)
REVOKE EXECUTE ON FUNCTION public.artesao_so_responde() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.autor_nao_altera_resposta() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.atualizar_ultima_mensagem() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.baixar_estoque_no_pagamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.comissao_bps(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_artisan_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.criar_minha_loja(text, text, text, bpchar, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.garantir_minha_loja(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.criar_pedido(jsonb, text, text, text, text, jsonb, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.progresso_da_loja(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_avaliar(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pedido_tem_item_meu(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.participa_da_conversa(uuid) FROM PUBLIC, anon;

-- funções usadas em políticas RLS continuam disponíveis para quem precisa
GRANT EXECUTE ON FUNCTION public.my_artisan_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_minha_loja(text, text, text, bpchar, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garantir_minha_loja(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_pedido(jsonb, text, text, text, text, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.progresso_da_loja(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_avaliar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedido_tem_item_meu(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.participa_da_conversa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.owns_artisan(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.caminho_e_da_minha_loja(text) TO authenticated;