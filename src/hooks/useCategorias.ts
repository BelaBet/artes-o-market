import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";

export interface Categoria {
  id: string;
  slug: string;
  name: string;
  img: string | null;
  tint?: string;
}

export function useCategorias() {
  const query = useQuery({
    queryKey: ["categorias"],
    queryFn: async (): Promise<Categoria[]> => {
      const { data: categorias, error } = await supabase
        .from("categories")
        .select("id, slug, name")
        .order("position");
      if (error) throw error;

      // Uma foto representativa por categoria: o primeiro produto ativo
      // que a usa. Puramente decorativo — sem categoria com produto
      // ainda, a tile some a imagem e mostra só o nome.
      const { data: produtos } = await supabase
        .from("products")
        .select("category_id, product_images(storage_path, tint, position)")
        .eq("status", "active")
        .not("category_id", "is", null);

      const imagemPorCategoria = new Map<string, { storage_path: string; tint: string | null }>();
      for (const p of produtos ?? []) {
        if (!p.category_id || imagemPorCategoria.has(p.category_id)) continue;
        const imagem = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
        if (imagem) imagemPorCategoria.set(p.category_id, imagem);
      }

      return (categorias ?? []).map((c) => {
        const imagem = imagemPorCategoria.get(c.id);
        return {
          id: c.id,
          slug: c.slug,
          name: c.name,
          img: resolverImagem(imagem?.storage_path),
          tint: imagem?.tint ?? undefined,
        };
      });
    },
    staleTime: 30 * 60_000,
  });

  return { categorias: query.data ?? [], loading: query.isLoading };
}
