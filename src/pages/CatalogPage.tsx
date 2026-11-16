import { useMemo, useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/data";
import { SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useProdutos } from "@/hooks/useProdutos";
import { useCategorias } from "@/hooks/useCategorias";

const NOME_DO_ESTADO: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão",
  MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais", PA: "Pará",
  PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí", RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte", RS: "Rio Grande do Sul", RO: "Rondônia", RR: "Roraima",
  SC: "Santa Catarina", SP: "São Paulo", SE: "Sergipe", TO: "Tocantins",
};

const PRECO_MAXIMO_PADRAO = 500;

const CatalogPage = () => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { produtos, loading } = useProdutos();
  const { categorias } = useCategorias();
  // ?skeleton=1 força o estado de carregamento — útil para conferir o
  // esqueleto no celular sem precisar estrangular a rede no DevTools.
  const [searchParams] = useSearchParams();
  const forcarSkeleton = searchParams.get("skeleton") === "1";
  const termoBusca = (searchParams.get("busca") ?? "").trim().toLowerCase();
  usePageMeta(
    "Catálogo",
    "Explore peças únicas de artesanato brasileiro: cerâmica, madeira, macramê, palha e pedra-sabão, direto de quem faz.",
  );

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [estadosSelecionados, setEstadosSelecionados] = useState<string[]>([]);
  const [avaliacaoMinima, setAvaliacaoMinima] = useState(0);
  const [precoMax, setPrecoMax] = useState(PRECO_MAXIMO_PADRAO);
  const [ordenacao, setOrdenacao] = useState("relevancia");

  const estadosDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.state).filter(Boolean))].sort(),
    [produtos],
  );

  const alternarSelecao = (lista: string[], valor: string, set: (v: string[]) => void) => {
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  };

  const produtosFiltrados = useMemo(() => {
    let lista = produtos;
    if (termoBusca) {
      lista = lista.filter((p) => [p.name, p.artist, p.city].some((c) => c?.toLowerCase().includes(termoBusca)));
    }
    if (categoriasSelecionadas.length > 0) {
      lista = lista.filter((p) => p.categorySlug && categoriasSelecionadas.includes(p.categorySlug));
    }
    if (estadosSelecionados.length > 0) {
      lista = lista.filter((p) => estadosSelecionados.includes(p.state));
    }
    if (avaliacaoMinima > 0) {
      lista = lista.filter((p) => p.stars >= avaliacaoMinima);
    }
    lista = lista.filter((p) => p.price <= precoMax);

    if (ordenacao === "menor-preco") lista = [...lista].sort((a, b) => a.price - b.price);
    else if (ordenacao === "melhor-avaliacao") lista = [...lista].sort((a, b) => b.stars - a.stars);
    // "relevancia" e "mais-novos" mantêm a ordem que já vem do banco
    // (criados mais recentes primeiro) — não há um critério de
    // relevância separado implementado ainda.

    return lista;
  }, [produtos, termoBusca, categoriasSelecionadas, estadosSelecionados, avaliacaoMinima, precoMax, ordenacao]);

  const Filters = (
    <>
      <div className="font-display text-[1.08rem] mb-5 pb-3 border-b border-border flex items-center justify-between">
        <span>Filtros</span>
        <button
          onClick={() => setFiltersOpen(false)}
          aria-label="Fechar filtros"
          className="lg:hidden p-1 text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Categoria</div>
        {categorias.map((c) => (
          <label key={c.slug} className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors">
            <input
              type="checkbox"
              className="accent-terra"
              checked={categoriasSelecionadas.includes(c.slug)}
              onChange={() => alternarSelecao(categoriasSelecionadas, c.slug, setCategoriasSelecionadas)}
            />
            {c.name}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Avaliação</div>
        {[5, 4, 3].map((n) => (
          <label key={n} className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors">
            <input
              type="radio"
              name="avaliacao"
              className="accent-terra"
              checked={avaliacaoMinima === n}
              onChange={() => setAvaliacaoMinima(n)}
            />
            {n === 5 ? "5 estrelas" : `${n}+ estrelas`}
          </label>
        ))}
        {avaliacaoMinima > 0 && (
          <button onClick={() => setAvaliacaoMinima(0)} className="text-[0.7rem] text-terra underline mt-1">
            Limpar
          </button>
        )}
      </div>

      {estadosDisponiveis.length > 0 && (
        <div className="mb-5">
          <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Estado</div>
          {estadosDisponiveis.map((uf) => (
            <label key={uf} className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors">
              <input
                type="checkbox"
                className="accent-terra"
                checked={estadosSelecionados.includes(uf)}
                onChange={() => alternarSelecao(estadosSelecionados, uf, setEstadosSelecionados)}
              />
              {NOME_DO_ESTADO[uf] ?? uf}
            </label>
          ))}
        </div>
      )}

      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Faixa de preço</div>
        <input
          type="range"
          min="0"
          max={PRECO_MAXIMO_PADRAO}
          value={precoMax}
          onChange={(e) => setPrecoMax(Number(e.target.value))}
          className="w-full accent-terra my-2"
        />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{formatPrice(0)}</span>
          <span>até {formatPrice(precoMax)}</span>
        </div>
      </div>
    </>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[235px_1fr] min-h-[80vh]">
      <aside className="hidden lg:block bg-parchment border-r border-border p-6">{Filters}</aside>

      {/* Mobile drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-[300] flex">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setFiltersOpen(false)} />
          <aside className="relative bg-parchment border-r border-border p-6 w-[85%] max-w-[320px] overflow-y-auto animate-[fadeIn_0.2s_ease]">
            {Filters}
          </aside>
        </div>
      )}

      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between gap-2 mb-5 pb-3 border-b border-border flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 border border-border px-3 py-1.5 font-body text-[0.68rem] tracking-[0.08em] uppercase"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
            </button>
            <span className="font-display text-[0.92rem] sm:text-[0.98rem] text-muted-foreground">
              {loading || forcarSkeleton ? (
                <Skeleton className="h-[0.9rem] w-[5.5rem] rounded-none inline-block align-middle" />
              ) : (
                <>
                  <strong className="text-foreground">{produtosFiltrados.length}</strong> produtos
                  {termoBusca && <> para "{searchParams.get("busca")}"</>}
                </>
              )}
            </span>
          </div>
          <select
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value)}
            className="border border-border bg-transparent px-2.5 py-1.5 font-body text-[0.7rem] tracking-[0.06em] outline-none cursor-pointer"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="melhor-avaliacao">Melhor avaliação</option>
            <option value="mais-novos">Mais novos</option>
          </select>
        </div>
        <ProductGrid products={produtosFiltrados} loading={loading || forcarSkeleton} />
      </div>
    </div>
  );
};

export default CatalogPage;
