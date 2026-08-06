import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { paraArtesao, paraPeca, type Artesao, type Peca } from "@/lib/catalogo";

// Colunas usadas pela vitrine. Explícitas de propósito: `select("*")`
// arrasta a descrição inteira de todo produto na listagem.
//
// `!inner` é obrigatório quando há filtro na tabela embutida: sem ele o
// PostgREST devolve a linha do produto mesmo assim, só com a relação
// vazia — o filtro não filtra nada.
function camposPeca({ comCategoria = false, comArtesao = false } = {}) {
  return `
    id, slug, title, description, price_cents, compare_at_price_cents,
    stock_mode, stock_quantity, status, featured, created_at,
    artisans:artisan_id${comArtesao ? "!inner" : ""} ( id, slug, shop_name, city, state ),
    categories:category_id${comCategoria ? "!inner" : ""} ( slug ),
    product_images ( storage_path, tint, position )
  `;
}

export interface FiltrosCatalogo {
  categorySlug?: string;
  artisanSlug?: string;
  limite?: number;
}

export function usePecas(filtros: FiltrosCatalogo = {}) {
  const { categorySlug, artisanSlug, limite } = filtros;

  const query = useQuery({
    queryKey: ["pecas", categorySlug ?? null, artisanSlug ?? null, limite ?? null],
    queryFn: async (): Promise<Peca[]> => {
      let q = supabase
        .from("products")
        .select(camposPeca({ comCategoria: !!categorySlug, comArtesao: !!artisanSlug }))
        .in("status", ["active", "sold_out"])
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (categorySlug) q = q.eq("categories.slug", categorySlug);
      if (artisanSlug) q = q.eq("artisans.slug", artisanSlug);
      if (limite) q = q.limit(limite);

      const { data, error } = await q;
      if (error) throw error;

      return (data ?? []).map((row) => paraPeca(row as never));
    },
    staleTime: 60_000,
  });

  return {
    pecas: query.data ?? [],
    loading: query.isLoading,
    erro: query.error as Error | null,
  };
}

/** Uma peça pelo slug — para a página de produto. */
export function usePeca(slug: string | undefined) {
  const query = useQuery({
    queryKey: ["peca", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Peca | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(camposPeca())
        .eq("slug", slug!)
        .in("status", ["active", "sold_out"])
        .maybeSingle();
      if (error) throw error;
      return data ? paraPeca(data as never) : null;
    },
    staleTime: 60_000,
  });

  return {
    peca: query.data ?? null,
    loading: query.isLoading,
    naoEncontrada: !query.isLoading && !query.isError && query.data === null,
  };
}

export function useCategorias() {
  const query = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, slug, name")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60_000,
  });

  return { categorias: query.data ?? [], loading: query.isLoading };
}

export function useArtesaos(limite = 3) {
  const query = useQuery({
    queryKey: ["artesaos", limite],
    queryFn: async (): Promise<Artesao[]> => {
      const { data, error } = await supabase
        .from("artisans")
        .select("*")
        .eq("status", "active")
        .order("verified", { ascending: false })
        .limit(limite);
      if (error) throw error;

      const { data: notas } = await supabase.from("artisan_ratings").select("*");

      return (data ?? []).map((row) =>
        paraArtesao(
          row,
          notas?.find((n) => n.artisan_id === row.id) ?? null,
        ),
      );
    },
    staleTime: 5 * 60_000,
  });

  return { artesaos: query.data ?? [], loading: query.isLoading };
}

export function useArtesao(slug: string | undefined) {
  const query = useQuery({
    queryKey: ["artesao", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Artesao | null> => {
      const { data, error } = await supabase
        .from("artisans")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: nota } = await supabase
        .from("artisan_ratings")
        .select("*")
        .eq("artisan_id", data.id)
        .maybeSingle();

      return paraArtesao(data, nota);
    },
    staleTime: 60_000,
  });

  return {
    artesao: query.data ?? null,
    loading: query.isLoading,
    naoEncontrado: !query.isLoading && !query.isError && query.data === null,
  };
}

export interface Avaliacao {
  id: string;
  rating: number;
  comment: string | null;
  artisanReply: string | null;
  createdAt: string;
  autor: string;
}

export function useAvaliacoes(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["avaliacoes", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<Avaliacao[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, artisan_reply, created_at")
        .eq("artisan_id", artisanId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;

      return (data ?? []).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        artisanReply: r.artisan_reply,
        createdAt: r.created_at,
        // O nome do avaliador virá de profiles quando houver join
        // liberado por policy; por ora, avaliação verificada e anônima.
        autor: "Compra verificada",
      }));
    },
    staleTime: 60_000,
  });

  return { avaliacoes: query.data ?? [], loading: query.isLoading };
}
