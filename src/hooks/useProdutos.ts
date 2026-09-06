import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";

export type Badge = "dest" | "novo" | "off" | null;

export interface ProdutoCard {
  id: string;
  slug: string;
  name: string;
  artist: string;
  artisanSlug: string;
  city: string;
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

async function buscarAvaliacoesPorProduto(ids: string[]): Promise<Map<string, { media: number; total: number }>> {
  const mapa = new Map<string, { media: number; total: number }>();
  if (ids.length === 0) return mapa;

  const { data } = await supabase.from("reviews").select("product_id, rating").in("product_id", ids);
  const somas = new Map<string, { soma: number; total: number }>();
  for (const r of data ?? []) {
    if (!r.product_id) continue;
    const atual = somas.get(r.product_id) ?? { soma: 0, total: 0 };
    atual.soma += r.rating;
    atual.total += 1;
    somas.set(r.product_id, atual);
  }
  for (const [id, { soma, total }] of somas) {
    mapa.set(id, { media: total ? Math.round(soma / total) : 0, total });
  }
  return mapa;
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
      price: p.price_cents / 100,
      priceCents: p.price_cents,
      oldPrice: p.compare_at_price_cents ? p.compare_at_price_cents / 100 : undefined,
      img: resolverImagem(imagem?.storage_path),
      tint: imagem?.tint ?? undefined,
      badge: badgeDoProduto(p),
      stars: nota?.media ?? 0,
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
