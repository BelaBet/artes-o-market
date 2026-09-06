-- =====================================================================
-- Vitrine pública mínima de `profiles`
--
-- POR QUE ESTE ARQUIVO EXISTE
-- `profiles` só é legível pelo próprio dono (RLS: auth.uid() = user_id).
-- Isso quebrou dois lugares novos que precisam mostrar o nome (e,
-- opcionalmente, a cidade) de OUTRA pessoa:
--   - avaliações reais de um produto/loja (o autor não é quem está
--     olhando a página);
--   - o painel de mensagens do artesão, mostrando o nome do comprador.
--
-- Como só display_name/city/state saem daqui — nunca e-mail, telefone,
-- documento ou qualquer coluna sensível — o modelo lembra artisans_publicas
-- (vitrine só com colunas seguras). A diferença importante: `artisans` já
-- tem uma policy pública para linhas ativas, então aquela view podia usar
-- security_invoker=on (só redige colunas). `profiles` NÃO tem nenhuma
-- policy pública — é só dono ou admin — então esta view precisa rodar
-- com o privilégio de quem a criou (padrão, security_invoker=off) para
-- furar essa RLS de propósito, do mesmo jeito que uma função
-- SECURITY DEFINER faria.
-- =====================================================================

CREATE VIEW public.profiles_publicos
WITH (security_barrier = true) AS
SELECT user_id, display_name, city, state, avatar_url
FROM public.profiles;

GRANT SELECT ON public.profiles_publicos TO anon, authenticated;
