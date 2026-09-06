import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";

export interface MeuProduto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  stockQuantity: number;
  status: "draft" | "active" | "sold_out" | "archived";
  categoryId: string | null;
  img: string | null;
  imagePath: string | null;
}

export function useMeusProdutos(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["meus-produtos", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<MeuProduto[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, title, description, price_cents, stock_quantity, status, category_id, product_images(storage_path, position)")
        .eq("artisan_id", artisanId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => {
        const imagem = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          description: p.description,
          priceCents: p.price_cents,
          stockQuantity: p.stock_quantity,
          status: p.status,
          categoryId: p.category_id,
          img: resolverImagem(imagem?.storage_path),
          imagePath: imagem?.storage_path ?? null,
        };
      });
    },
    staleTime: 10_000,
  });

  return { produtos: query.data ?? [], loading: query.isLoading };
}

export interface DadosProduto {
  title: string;
  description: string;
  priceCents: number;
  stockQuantity: number;
  status: MeuProduto["status"];
  categoryId: string | null;
}

async function gerarSlugUnico(base: string): Promise<string> {
  const raiz = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "produto";
  let slug = raiz;
  let n = 1;
  for (;;) {
    const { data } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${raiz}-${n}`;
  }
}

export function useSalvarProduto(artisanId: string | undefined) {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);

  const criar = useCallback(
    async (dados: DadosProduto, imagem?: File): Promise<string> => {
      if (!artisanId) throw new Error("Sem loja associada");
      setSalvando(true);
      try {
        const slug = await gerarSlugUnico(dados.title);
        const { data: produto, error } = await supabase
          .from("products")
          .insert({
            artisan_id: artisanId,
            slug,
            title: dados.title,
            description: dados.description || null,
            price_cents: dados.priceCents,
            stock_quantity: dados.stockQuantity,
            status: dados.status,
            category_id: dados.categoryId,
          })
          .select("id")
          .single();
        if (error) throw error;

        if (imagem) {
          await enviarImagemProduto(artisanId, produto.id, imagem);
        }

        queryClient.invalidateQueries({ queryKey: ["meus-produtos", artisanId] });
        queryClient.invalidateQueries({ queryKey: ["produtos"] });
        return produto.id;
      } finally {
        setSalvando(false);
      }
    },
    [artisanId, queryClient],
  );

  const atualizar = useCallback(
    async (productId: string, dados: DadosProduto, imagem?: File) => {
      if (!artisanId) throw new Error("Sem loja associada");
      setSalvando(true);
      try {
        const { error } = await supabase
          .from("products")
          .update({
            title: dados.title,
            description: dados.description || null,
            price_cents: dados.priceCents,
            stock_quantity: dados.stockQuantity,
            status: dados.status,
            category_id: dados.categoryId,
          })
          .eq("id", productId);
        if (error) throw error;

        if (imagem) {
          await enviarImagemProduto(artisanId, productId, imagem);
        }

        queryClient.invalidateQueries({ queryKey: ["meus-produtos", artisanId] });
        queryClient.invalidateQueries({ queryKey: ["produtos"] });
      } finally {
        setSalvando(false);
      }
    },
    [artisanId, queryClient],
  );

  const remover = useCallback(
    async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["meus-produtos", artisanId] });
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
    },
    [artisanId, queryClient],
  );

  return { criar, atualizar, remover, salvando };
}

async function enviarImagemProduto(artisanId: string, productId: string, arquivo: File) {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const caminho = `${artisanId}/produtos/${productId}/0-${Date.now()}.${extensao}`;
  const { error: erroUpload } = await supabase.storage
    .from("lojas")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });
  if (erroUpload) throw erroUpload;

  // Uma imagem por produto por enquanto: substitui a anterior.
  await supabase.from("product_images").delete().eq("product_id", productId);
  const { error: erroInsert } = await supabase
    .from("product_images")
    .insert({ product_id: productId, storage_path: caminho, position: 0 });
  if (erroInsert) throw erroInsert;
}
