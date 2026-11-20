import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";
import { agregarNotas, type Nota } from "@/lib/avaliacoes";

export type Badge = "dest" | "novo" | "off" | null;

export interface ProdutoCard {
  id: string;
  slug: string;
  name: string;
  artist: string;
  artisanSlug: string;
  city: string;
  state: string;
  price: number;
  priceCents: number;
  oldPrice?: number;
  img: string | null;
  tint?: string;
  badge: Badge;
  stars: number;
  reviews: number;
  categorySlug: string | null;
  stockQuantity: number;
}

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

function badgeDoProduto(row: {
  featured: boolean;
  compare_at_price_cents: number | null;
  price_cents: number;
  created_at: string;
}): Badge {
  if (row.featured) return "dest";
  if (row.compare_at_price_cents && row.compare_at_price_cents > row.price_cents) return "off";
  if (Date.now() - new Date(row.created_at).getTime() < TRINTA_DIAS_MS) return "novo";
  return null;
}

async function buscarAvaliacoesPorProduto(ids: string[]): Promise<Map<string, Nota>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("reviews").select("product_id, rating").in("product_id", ids);
  return agregarNotas((data ?? []).map((r) => ({ chave: r.product_id, rating: r.rating })));
}

const SELECT_PRODUTO_CARD = `
  id, slug, title, price_cents, compare_at_price_cents, featured, created_at, stock_quantity,
  product_images(storage_path, tint, position),
  artisans(slug, shop_name, public_name, city, state),
  categories(slug)
`;

type LinhaProduto = {
  id: string;
  slug: string;
  title: string;
  price_cents: number;
  compare_at_price_cents: number | null;
  featured: boolean;
  created_at: string;
  stock_quantity: number;
  product_images: { storage_path: string; tint: string | null; position: number }[] | null;
  artisans: { slug: string; shop_name: string; public_name: string | null; city: string | null; state: string | null } | null;
  categories: { slug: string } | null;
};

async function mapearProdutos(linhas: LinhaProduto[]): Promise<ProdutoCard[]> {
  const avaliacoes = await buscarAvaliacoesPorProduto(linhas.map((p) => p.id));
  return linhas.map((p): ProdutoCard => {
    const imagem = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
    const artesao = p.artisans;
    const nota = avaliacoes.get(p.id);
    return {
      id: p.id,
      slug: p.slug,
      name: p.title,
      artist: artesao?.public_name || artesao?.shop_name || "Artesão",
      artisanSlug: artesao?.slug ?? "",
      city: artesao ? `${artesao.city ?? ""}${artesao.city && artesao.state ? ", " : ""}${artesao.state ?? ""}` : "",
      state: artesao?.state ?? "",
      price: p.price_cents / 100,
      priceCents: p.price_cents,
      oldPrice: p.compare_at_price_cents ? p.compare_at_price_cents / 100 : undefined,
      img: resolverImagem(imagem?.storage_path),
      tint: imagem?.tint ?? undefined,
      badge: badgeDoProduto(p),
      stars: nota ? Math.round(nota.media) : 0,
      reviews: nota?.total ?? 0,
      categorySlug: p.categories?.slug ?? null,
      stockQuantity: p.stock_quantity,
    };
  });
}

async function buscarProdutos(): Promise<ProdutoCard[]> {
  const { data, error } = await supabase
    .from("products")
    .select(SELECT_PRODUTO_CARD)
    .in("status", ["active", "sold_out"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return mapearProdutos(data ?? []);
}

export function useProdutos() {
  const query = useQuery({
    queryKey: ["produtos"],
    queryFn: buscarProdutos,
    staleTime: 30_000,
  });

  return {
    produtos: query.data ?? [],
    loading: query.isLoading,
    erro: query.error as Error | null,
  };
}

export function useProdutosDoArtesao(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["produtos-do-artesao", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<ProdutoCard[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(SELECT_PRODUTO_CARD)
        .eq("artisan_id", artisanId!)
        .in("status", ["active", "sold_out"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return mapearProdutos(data ?? []);
    },
    staleTime: 15_000,
  });

  return { produtos: query.data ?? [], loading: query.isLoading };
}

/**
 * Busca vários produtos pelo id, na mesma ordem da lista pedida — usada
 * pelos favoritos e pelos últimos visualizados, onde essa ordem (quem foi
 * curtido/visto mais recentemente) é o que importa, não a de criação.
 */
export function useProdutosPorIds(ids: string[]) {
  const chave = ids.join(",");
  const query = useQuery({
    queryKey: ["produtos-por-ids", chave],
    enabled: ids.length > 0,
    queryFn: async (): Promise<ProdutoCard[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(SELECT_PRODUTO_CARD)
        .in("id", ids)
        .in("status", ["active", "sold_out"]);
      if (error) throw error;
      const cartoes = await mapearProdutos(data ?? []);
      const porId = new Map(cartoes.map((c) => [c.id, c]));
      return ids.map((id) => porId.get(id)).filter((c): c is ProdutoCard => !!c);
    },
    staleTime: 15_000,
  });

  return { produtos: ids.length > 0 ? query.data ?? [] : [], loading: ids.length > 0 && query.isLoading };
}

export interface ProdutoDetalhe extends ProdutoCard {
  description: string | null;
  images: string[];
}

export function useProdutoPorSlug(slug: string | undefined) {
  const query = useQuery({
    queryKey: ["produto", slug],
    enabled: !!slug,
    queryFn: async (): Promise<ProdutoDetalhe | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(`description, ${SELECT_PRODUTO_CARD}`)
        .eq("slug", slug!)
        .in("status", ["active", "sold_out"])
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [cartao] = await mapearProdutos([data]);
      const imagens = [...(data.product_images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((img) => resolverImagem(img.storage_path))
        .filter((src): src is string => !!src);
      return { ...cartao, description: data.description, images: imagens };
    },
    staleTime: 30_000,
  });

  return { produto: query.data ?? null, loading: query.isLoading };
}

export interface AvaliacaoProduto {
  id: string;
  name: string;
  rating: number;
  comment: string | null;
  date: string;
}

/** Avaliações reais (pós-compra) de um produto específico. */
export function useAvaliacoesDoProduto(productId: string | undefined) {
  const query = useQuery({
    queryKey: ["avaliacoes-produto", productId],
    enabled: !!productId,
    queryFn: async (): Promise<AvaliacaoProduto[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, author_id")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      const linhas = data ?? [];

      const autorIds = [...new Set(linhas.map((r) => r.author_id))];
      const { data: perfis } = autorIds.length
        ? await supabase.from("profiles_publicos").select("user_id, display_name").in("user_id", autorIds)
        : { data: [] as { user_id: string; display_name: string | null }[] };
      const nomePorId = new Map((perfis ?? []).map((p) => [p.user_id, p.display_name]));

      return linhas.map((r) => ({
        id: r.id,
        name: nomePorId.get(r.author_id) || "Comprador",
        rating: r.rating,
        comment: r.comment,
        date: r.created_at,
      }));
    },
    staleTime: 30_000,
  });

  return { avaliacoes: query.data ?? [], loading: query.isLoading };
}
