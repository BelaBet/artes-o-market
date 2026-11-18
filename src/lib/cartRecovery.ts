import type { CartItem, CartItemKind } from "@/contexts/CartContext";

interface ResumoItem {
  id: string;
  kind: CartItemKind;
  qty: number;
}

/**
 * Serializa só o essencial do carrinho (id, tipo, quantidade) pra caber
 * como parâmetro na URL de confirmação de e-mail. Sem nome/preço/imagem:
 * isso é buscado de novo no banco — já atualizado — na hora de restaurar.
 *
 * Por quê: o link de confirmação quase nunca abre no mesmo navegador
 * onde a pessoa estava comprando (o app de e-mail abre em outro), então
 * o carrinho salvo em localStorage não existe ali. Levar esse resumo na
 * própria URL de confirmação é o jeito de o carrinho sobreviver à troca.
 */
export function codificarCarrinho(items: CartItem[]): string {
  return items.map((i) => `${i.id}:${i.kind === "experience" ? "e" : "p"}:${i.qty}`).join(",");
}

export function decodificarCarrinho(param: string): ResumoItem[] {
  return param
    .split(",")
    .map((parte): ResumoItem | null => {
      const [id, tipo, qty] = parte.split(":");
      if (!id || !tipo || !qty) return null;
      return { id, kind: tipo === "e" ? "experience" : "product", qty: Math.max(1, Number(qty) || 1) };
    })
    .filter((v): v is ResumoItem => v !== null);
}

/**
 * Busca os dados atuais (nome, preço, imagem) dos itens indicados no
 * resumo. Importa o cliente Supabase sob demanda — CartContext carrega
 * este módulo sempre, mas só entra aqui quando a URL tem `?cart=`.
 */
export async function buscarItensParaRestaurar(resumo: ResumoItem[]): Promise<CartItem[]> {
  const [{ supabase }, { resolverImagem }] = await Promise.all([
    import("@/integrations/supabase/client"),
    import("@/lib/imagens"),
  ]);
  const idsProdutos = resumo.filter((i) => i.kind === "product").map((i) => i.id);
  const idsExperiencias = resumo.filter((i) => i.kind === "experience").map((i) => i.id);
  const qtyPorId = new Map(resumo.map((i) => [i.id, i.qty]));
  const itens: CartItem[] = [];

  if (idsProdutos.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, title, price_cents, product_images(storage_path, position), artisans(public_name, shop_name)")
      .in("id", idsProdutos)
      .in("status", ["active", "sold_out"]);
    for (const p of data ?? []) {
      const imagem = [...(p.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
      itens.push({
        id: p.id,
        kind: "product",
        name: p.title,
        artist: p.artisans?.public_name || p.artisans?.shop_name || "Artesão",
        price: p.price_cents / 100,
        priceCents: p.price_cents,
        img: resolverImagem(imagem?.storage_path),
        qty: qtyPorId.get(p.id) ?? 1,
      });
    }
  }

  if (idsExperiencias.length > 0) {
    const { data } = await supabase
      .from("experiences")
      .select("id, title, price_cents, cover_path, artisans(public_name, shop_name)")
      .in("id", idsExperiencias)
      .in("status", ["active", "sold_out"]);
    for (const e of data ?? []) {
      itens.push({
        id: e.id,
        kind: "experience",
        name: e.title,
        artist: e.artisans?.public_name || e.artisans?.shop_name || "Artesão",
        price: e.price_cents / 100,
        priceCents: e.price_cents,
        img: resolverImagem(e.cover_path),
        qty: qtyPorId.get(e.id) ?? 1,
      });
    }
  }

  return itens;
}
