import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";

export interface ArtesaoCard {
  slug: string;
  name: string;
  loc: string;
  spec: string;
  bio: string | null;
  img: string | null;
  verified: boolean;
  sales: string;
  rating: string;
  followers: string;
}

function paraCard(a: {
  slug: string;
  shop_name: string;
  public_name: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  verified: boolean;
}): ArtesaoCard {
  return {
    slug: a.slug,
    name: a.public_name || a.shop_name,
    loc: [a.city, a.state].filter(Boolean).join(", "),
    spec: a.headline ?? "",
    bio: a.bio,
    img: resolverImagem(a.avatar_url),
    verified: a.verified,
    // Vendas/seguidores ainda não são métricas reais na plataforma.
    sales: "—",
    rating: "—",
    followers: "—",
  };
}

export function useArtesaosDestaque(limite = 3) {
  const query = useQuery({
    queryKey: ["artesaos-destaque", limite],
    queryFn: async (): Promise<ArtesaoCard[]> => {
      const { data, error } = await supabase
        .from("artisans_publicas")
        .select("slug, shop_name, public_name, headline, bio, city, state, avatar_url, verified")
        .order("verified", { ascending: false })
        .limit(limite);
      if (error) throw error;
      return (data ?? []).map(paraCard);
    },
    staleTime: 30_000,
  });

  return { artesaos: query.data ?? [], loading: query.isLoading };
}

export function useArtesaoPorSlug(slug: string | undefined) {
  const query = useQuery({
    queryKey: ["artesao", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artisans_publicas")
        .select(
          "id, slug, shop_name, public_name, headline, bio, city, state, avatar_url, cover_url, verified",
        )
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...paraCard(data), id: data.id };
    },
    staleTime: 30_000,
  });

  return { artesao: query.data ?? null, loading: query.isLoading };
}

export interface AvaliacaoLoja {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  comment: string | null;
  product: string | null;
  date: string;
}

/**
 * Avaliações reais (pós-compra) de uma loja. `reviews` não guarda nome
 * nem cidade de quem avaliou — vêm de `profiles`, que não tem FK direta
 * com `reviews` (ambas apontam para auth.users), então buscamos em duas
 * consultas em vez de um embed do PostgREST.
 */
export function useAvaliacoesDoArtesao(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["avaliacoes-loja", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<AvaliacaoLoja[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, author_id, products(title)")
        .eq("artisan_id", artisanId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const linhas = data ?? [];

      const autorIds = [...new Set(linhas.map((r) => r.author_id))];
      const { data: perfis } = autorIds.length
        ? await supabase.from("profiles_publicos").select("user_id, display_name, city, state").in("user_id", autorIds)
        : { data: [] as { user_id: string; display_name: string | null; city: string | null; state: string | null }[] };
      const perfilPorId = new Map((perfis ?? []).map((p) => [p.user_id, p]));

      return linhas.map((r) => {
        const perfil = perfilPorId.get(r.author_id);
        return {
          id: r.id,
          name: perfil?.display_name || "Comprador",
          city: perfil ? [perfil.city, perfil.state].filter(Boolean).join(", ") || null : null,
          rating: r.rating,
          comment: r.comment,
          product: r.products?.title ?? null,
          date: r.created_at,
        };
      });
    },
    staleTime: 30_000,
  });

  return { avaliacoes: query.data ?? [], loading: query.isLoading };
}
