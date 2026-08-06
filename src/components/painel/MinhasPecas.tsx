import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import FormularioPeca from "@/components/painel/FormularioPeca";
import { useMinhaLoja } from "@/hooks/useMinhaLoja";
import {
  ROTULO_STATUS_PRODUTO,
  useMeusProdutos,
  type ProdutoComImagens,
} from "@/hooks/useProdutosArtesao";

const formatarPreco = (centavos: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);

const capa = (produto: ProdutoComImagens) => {
  const img = [...(produto.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
  if (!img) return null;
  return supabase.storage.from("produtos").getPublicUrl(img.storage_path).data.publicUrl;
};

const MinhasPecas = () => {
  const { loja } = useMinhaLoja();
  const { produtos, loading } = useMeusProdutos(loja?.id);
  const [editando, setEditando] = useState<string | null | false>(false);

  if (editando !== false) {
    return <FormularioPeca produtoId={editando} onVoltar={() => setEditando(false)} />;
  }

  if (loading || !loja) {
    return (
      <div className="max-w-[820px]">
        <Skeleton className="h-[1.8rem] w-1/3 rounded-none mb-5" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[5rem] w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[820px]">
      <div className="flex items-end justify-between gap-3 mb-6">
        <div>
          <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-1.5">
            Minhas peças
          </div>
          <h2 className="font-display text-[1.5rem] sm:text-[1.85rem] font-light leading-tight">
            O que está na sua loja
          </h2>
        </div>
        <button
          onClick={() => setEditando(null)}
          className="shrink-0 flex items-center gap-1.5 bg-terra text-background px-4 py-2.5 font-body text-[0.66rem] tracking-[0.12em] uppercase hover:brightness-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Nova peça
        </button>
      </div>

      {produtos.length === 0 ? (
        <div className="border border-border py-14 px-6 text-center">
          <div className="font-display text-[1.2rem] mb-1.5">Nenhuma peça ainda</div>
          <p className="text-[0.84rem] text-muted-foreground font-light mb-6 max-w-[400px] mx-auto leading-[1.7]">
            Publique sua primeira peça para que compradores possam encontrá-la. Uma foto, um
            nome e um preço já bastam para começar.
          </p>
          <button
            onClick={() => setEditando(null)}
            className="border border-foreground px-6 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:bg-foreground hover:text-background transition-colors"
          >
            Cadastrar minha primeira peça
          </button>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {produtos.map((p) => {
            const foto = capa(p);
            return (
              <button
                key={p.id}
                onClick={() => setEditando(p.id)}
                className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-parchment transition-colors"
              >
                <div className="w-[56px] h-[56px] shrink-0 border border-border bg-parchment overflow-hidden">
                  {foto && <img src={foto} alt="" className="w-full h-full object-cover" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-display text-[1rem] leading-tight truncate">{p.title}</div>
                  <div className="text-[0.74rem] text-muted-foreground">
                    {formatarPreco(p.price_cents)}
                    {p.stock_mode === "unique"
                      ? " · peça única"
                      : ` · ${p.stock_quantity} disponíveis`}
                  </div>
                </div>

                <span
                  className={`shrink-0 font-body text-[0.56rem] tracking-[0.12em] uppercase px-2 py-1 border ${
                    p.status === "active"
                      ? "border-sage text-sage"
                      : p.status === "draft"
                        ? "border-border text-muted-foreground"
                        : "border-terra text-terra"
                  }`}
                >
                  {ROTULO_STATUS_PRODUTO[p.status] ?? p.status}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MinhasPecas;
