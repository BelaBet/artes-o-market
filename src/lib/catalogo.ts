import { supabase } from "@/integrations/supabase/client";
import { IMAGES } from "@/lib/data";
import type { Tables } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------
// Tipos que o front consome
// ---------------------------------------------------------------------
export type BadgeKey = "dest" | "novo" | "off";

export interface Peca {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  compareAtCents: number | null;
  categorySlug: string | null;
  imageUrl: string | null;
  tint: string | null;
  badge: BadgeKey | null;
  stockMode: "unique" | "quantity";
  stockQuantity: number;
  artisan: {
    id: string;
    slug: string;
    shopName: string;
    city: string | null;
    state: string | null;
  };
}

export interface Artesao {
  id: string;
  slug: string;
  shopName: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  verified: boolean;
  avatarUrl: string | null;
  coverUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
}

// ---------------------------------------------------------------------
// Resolução de imagem
//
// O seed grava `seed/<chave>.jpg`, que aponta para os arquivos
// empacotados em src/assets. Quando o artesão sobe foto pelo painel, o
// caminho vira {artisan_id}/... no bucket `produtos` e resolvemos pela
// URL pública do Storage.
// ---------------------------------------------------------------------
const PREFIXO_SEED = "seed/";

export function resolverImagem(
  storagePath: string | null | undefined,
  bucket = "produtos",
): string | null {
  if (!storagePath) return null;

  if (storagePath.startsWith(PREFIXO_SEED)) {
    const chave = storagePath.slice(PREFIXO_SEED.length).replace(/\.[^.]+$/, "");
    return IMAGES[chave] ?? null;
  }

  if (/^https?:\/\//.test(storagePath)) return storagePath;

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ---------------------------------------------------------------------
// Selos
//
// Derivados, não guardados: "novo" é uma janela de tempo e "promoção" é
// a existência de preço anterior. Guardar em coluna significaria alguém
// ter que lembrar de tirar o selo depois.
// ---------------------------------------------------------------------
const DIAS_PARA_SER_NOVO = 30;

function calcularBadge(row: {
  featured: boolean;
  compare_at_price_cents: number | null;
  created_at: string;
}): BadgeKey | null {
  if (row.compare_at_price_cents) return "off";
  if (row.featured) return "dest";

  const dias = (Date.now() - new Date(row.created_at).getTime()) / 86_400_000;
  return dias <= DIAS_PARA_SER_NOVO ? "novo" : null;
}

// ---------------------------------------------------------------------
// Adaptadores: linha do banco → objeto do front
// ---------------------------------------------------------------------
type LinhaProduto = Tables<"products"> & {
  artisans: Pick<Tables<"artisans">, "id" | "slug" | "shop_name" | "city" | "state"> | null;
  categories: Pick<Tables<"categories">, "slug"> | null;
  product_images: Pick<Tables<"product_images">, "storage_path" | "tint" | "position">[] | null;
};

export function paraPeca(row: LinhaProduto): Peca {
  const capa = [...(row.product_images ?? [])].sort((a, b) => a.position - b.position)[0];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    compareAtCents: row.compare_at_price_cents,
    categorySlug: row.categories?.slug ?? null,
    imageUrl: resolverImagem(capa?.storage_path),
    tint: capa?.tint ?? null,
    badge: calcularBadge(row),
    stockMode: row.stock_mode,
    stockQuantity: row.stock_quantity,
    artisan: {
      id: row.artisans?.id ?? "",
      slug: row.artisans?.slug ?? "",
      shopName: row.artisans?.shop_name ?? "Artesão",
      city: row.artisans?.city ?? null,
      state: row.artisans?.state ?? null,
    },
  };
}

export function paraArtesao(
  row: Tables<"artisans">,
  rating?: { average_rating: number | null; review_count: number | null } | null,
): Artesao {
  return {
    id: row.id,
    slug: row.slug,
    shopName: row.shop_name,
    headline: row.headline,
    bio: row.bio,
    city: row.city,
    state: row.state,
    verified: row.verified,
    avatarUrl: resolverImagem(row.avatar_url, "lojas"),
    coverUrl: resolverImagem(row.cover_url, "lojas"),
    averageRating: rating?.average_rating ?? null,
    reviewCount: rating?.review_count ?? 0,
  };
}

// ---------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarCentavos(centavos: number): string {
  return BRL.format(centavos / 100);
}

export function localizacao(cidade: string | null, uf: string | null): string {
  return [cidade, uf].filter(Boolean).join(", ");
}
