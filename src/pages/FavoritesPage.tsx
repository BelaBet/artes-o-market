import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useProdutosPorIds } from "@/hooks/useProdutos";
import { lerVisualizados } from "@/lib/recentlyViewed";
import { usePageMeta } from "@/hooks/usePageMeta";
import ProductGrid from "@/components/ProductGrid";

const FavoritesPage = () => {
  usePageMeta("Favoritos", "Os produtos que você marcou com coração e os últimos que você visualizou.");
  const { favoritos } = useFavorites();
  const [visualizadosIds, setVisualizadosIds] = useState<string[]>([]);

  // Lido uma vez, ao abrir a página — não precisa reagir a mudanças em
  // tempo real, já que só muda ao abrir um produto em OUTRA página.
  useEffect(() => {
    setVisualizadosIds(lerVisualizados());
  }, []);

  const { produtos: favoritosCards, loading: carregandoFavoritos } = useProdutosPorIds(favoritos);
  const { produtos: visualizadosCards, loading: carregandoVisualizados } = useProdutosPorIds(visualizadosIds);

  return (
    <div className="max-w-[1320px] mx-auto px-4 md:px-9 py-10 sm:py-14">
      <h1 className="font-display text-[1.8rem] sm:text-[2.2rem] font-light mb-1">Favoritos</h1>
      <p className="text-[0.82rem] text-muted-foreground mb-8">Tudo que você marcou com coração no catálogo.</p>

      {favoritos.length === 0 ? (
        <div className="border border-border bg-background py-12 px-6 text-center mb-12">
          <div className="font-display text-[1.1rem] mb-1">Você ainda não favoritou nada</div>
          <p className="text-[0.78rem] text-muted-foreground mb-3">
            Clique no ♡ de um produto no catálogo pra guardá-lo aqui.
          </p>
          <Link to="/catalogo" className="text-terra underline text-[0.82rem]">
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <div className="mb-12">
          <ProductGrid products={favoritosCards} loading={carregandoFavoritos} />
        </div>
      )}

      <h2 className="font-display text-[1.3rem] font-light mb-1 pt-4 border-t border-border">Últimos visualizados</h2>
      <p className="text-[0.82rem] text-muted-foreground mb-8">Os produtos que você abriu mais recentemente.</p>

      {visualizadosIds.length === 0 ? (
        <p className="text-[0.82rem] text-muted-foreground">Nenhum produto visualizado ainda.</p>
      ) : (
        <ProductGrid products={visualizadosCards} loading={carregandoVisualizados} />
      )}
    </div>
  );
};

export default FavoritesPage;
