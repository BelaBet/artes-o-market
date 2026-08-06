import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Produto = Tables<"products">;
export type ImagemProduto = Tables<"product_images">;
export type StatusProduto = Produto["status"];

export interface ProdutoComImagens extends Produto {
  product_images: ImagemProduto[];
}

export const ROTULO_STATUS_PRODUTO: Record<string, string> = {
  draft: "Rascunho",
  active: "Publicada",
  sold_out: "Vendida",
  archived: "Arquivada",
};

/** Peças da loja, incluindo rascunhos (que a vitrine não mostra). */
export function useMeusProdutos(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["meus-produtos", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<ProdutoComImagens[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images ( * )")
        .eq("artisan_id", artisanId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProdutoComImagens[];
    },
    staleTime: 15_000,
  });

  return { produtos: query.data ?? [], loading: query.isLoading };
}

export function useProduto(id: string | undefined) {
  const query = useQuery({
    queryKey: ["produto", id],
    enabled: !!id && id !== "novo",
    queryFn: async (): Promise<ProdutoComImagens | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images ( * )")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ProdutoComImagens | null;
    },
    staleTime: 10_000,
  });

  return { produto: query.data ?? null, loading: query.isLoading };
}

/**
 * Slug a partir do título.
 *
 * O artesão não deveria pensar em endereço de página. Como slug é único
 * no banco, um sufixo curto evita colisão entre peças de nome parecido
 * de lojas diferentes ("Vaso de Cerâmica" existe em toda cidade).
 */
function gerarSlug(titulo: string): string {
  const base = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const sufixo = Math.random().toString(36).slice(2, 6);
  return `${base || "peca"}-${sufixo}`;
}

export function useSalvarProduto() {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
    queryClient.invalidateQueries({ queryKey: ["produto"] });
    queryClient.invalidateQueries({ queryKey: ["pecas"] });
    queryClient.invalidateQueries({ queryKey: ["progresso"] });
  };

  const criar = useMutation({
    mutationFn: async (dados: {
      artisan_id: string;
      title: string;
      price_cents: number;
    }): Promise<Produto> => {
      const { data, error } = await supabase
        .from("products")
        .insert({
          artisan_id: dados.artisan_id,
          title: dados.title,
          slug: gerarSlug(dados.title),
          price_cents: dados.price_cents,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidar,
  });

  const atualizar = useMutation({
    mutationFn: async (dados: { id: string } & Partial<Produto>): Promise<Produto> => {
      const { id, ...campos } = dados;
      const { data, error } = await supabase
        .from("products")
        .update(campos)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });

  return { criar, atualizar, remover };
}

/**
 * Fotos da peça.
 *
 * O caminho começa com o id da loja — é o que a policy do Storage usa
 * para impedir uma loja de escrever na pasta de outra.
 */
export function useFotosProduto(produtoId: string | undefined, artisanId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["produto", produtoId] });
    queryClient.invalidateQueries({ queryKey: ["meus-produtos"] });
  };

  const enviar = useMutation({
    mutationFn: async (arquivo: File) => {
      if (!produtoId || !artisanId) throw new Error("Salve a peça antes de enviar fotos.");
      if (arquivo.size > 5 * 1024 * 1024) throw new Error("A foto passou de 5 MB.");

      const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const caminho = `${artisanId}/produtos/${produtoId}-${Date.now()}.${extensao}`;

      const { error: erroUpload } = await supabase.storage
        .from("produtos")
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (erroUpload) throw erroUpload;

      const { count } = await supabase
        .from("product_images")
        .select("id", { count: "exact", head: true })
        .eq("product_id", produtoId);

      const { error } = await supabase.from("product_images").insert({
        product_id: produtoId,
        storage_path: caminho,
        alt: null,
        position: count ?? 0,
      });
      if (error) throw error;

      return caminho;
    },
    onSuccess: invalidar,
  });

  const remover = useMutation({
    mutationFn: async (imagem: ImagemProduto) => {
      await supabase.storage.from("produtos").remove([imagem.storage_path]);
      const { error } = await supabase.from("product_images").delete().eq("id", imagem.id);
      if (error) throw error;
    },
    onSuccess: invalidar,
  });

  return {
    enviar: enviar.mutateAsync,
    enviando: enviar.isPending,
    remover: remover.mutateAsync,
  };
}

// ---------------------------------------------------------------------
// Descrição com ajuda de IA
//
// A chamada vai para uma edge function, nunca direto do navegador: a
// chave do provedor não pode viver no front, que é público.
// ---------------------------------------------------------------------
export interface DadosParaDescricao {
  titulo: string;
  materiais?: string[];
  tecnicas?: string[];
  cidade?: string | null;
  estado?: string | null;
  dimensoes?: string;
  observacoes?: string;
}

export function useDescricaoAssistida() {
  return useMutation({
    mutationFn: async (dados: DadosParaDescricao): Promise<string> => {
      const { data, error } = await supabase.functions.invoke("descrever-peca", {
        body: dados,
      });

      if (error) throw error;
      if (!data?.descricao) throw new Error("Não recebemos uma sugestão desta vez.");
      return data.descricao as string;
    },
  });
}

/** A ajuda de escrita só aparece se a função estiver publicada e com chave. */
export function useDescricaoDisponivel() {
  const query = useQuery({
    queryKey: ["descricao-disponivel"],
    queryFn: async (): Promise<boolean> => {
      try {
        const { data, error } = await supabase.functions.invoke("descrever-peca", {
          body: { ping: true },
        });
        if (error) return false;
        return data?.disponivel === true;
      } catch {
        return false;
      }
    },
    staleTime: 10 * 60_000,
    retry: false,
  });

  return query.data === true;
}
