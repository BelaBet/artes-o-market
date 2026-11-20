import { useEffect, useState } from "react";
import { Navigate, Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BADGE_MAP, formatPrice } from "@/lib/data";
import { useProdutoPorSlug, useAvaliacoesDoProduto } from "@/hooks/useProdutos";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { registrarVisualizacao } from "@/lib/recentlyViewed";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Skeleton } from "@/components/ui/skeleton";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";

const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { produto, loading } = useProdutoPorSlug(slug);
  const { avaliacoes } = useAvaliacoesDoProduto(produto?.id);
  const { addItem } = useCart();
  const { isFavorito, alternarFavorito } = useFavorites();
  const [imagemAtiva, setImagemAtiva] = useState(0);

  usePageMeta(
    produto ? `${produto.name} — ${produto.artist}` : "Produto",
    produto ? `${produto.name}, por ${produto.artist}. ${formatPrice(produto.price)}.` : undefined,
  );

  useEffect(() => {
    if (produto) registrarVisualizacao(produto.id);
  }, [produto]);

  useEffect(() => {
    setImagemAtiva(0);
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 md:px-9 py-10">
        <Skeleton className="h-[420px] w-full rounded-none" />
      </div>
    );
  }

  // Slug inexistente ou produto inativo cai no 404 em vez de quebrar em runtime.
  if (!produto) return <Navigate to="/404" replace />;

  const imagens = produto.images.length > 0 ? produto.images : [produto.img].filter((i): i is string => !!i);
  const favorito = isFavorito(produto.id);
  const avgRating = avaliacoes.length ? avaliacoes.reduce((s, r) => s + r.rating, 0) / avaliacoes.length : null;

  const adicionarAoCarrinho = () => {
    addItem(produto);
    toast.success("Adicionado ao carrinho!");
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-9 py-8 sm:py-12">
      <button
        onClick={() => navigate(-1)}
        className="text-[0.64rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← Voltar
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12">
        {/* Galeria */}
        <div>
          <div className="aspect-square relative bg-parchment overflow-hidden mb-2">
            {produto.badge && (
              <span className={`absolute top-3 left-3 text-[0.58rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 z-[2] ${BADGE_MAP[produto.badge].className}`}>
                {BADGE_MAP[produto.badge].label}
              </span>
            )}
            <ImagemComPlaceholder
              src={imagens[imagemAtiva] ?? undefined}
              alt={produto.name}
              tint={produto.tint}
              prioridade
              className="w-full h-full object-cover saturate-[0.9]"
            />
          </div>
          {imagens.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {imagens.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setImagemAtiva(i)}
                  className={`aspect-square overflow-hidden border transition-colors ${i === imagemAtiva ? "border-terra" : "border-border hover:border-muted-foreground"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalhes */}
        <div>
          <Link
            to={`/artesao/${produto.artisanSlug}`}
            className="text-[0.64rem] tracking-[0.1em] uppercase text-terra hover:underline"
          >
            por {produto.artist}
          </Link>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mt-1 mb-3 leading-tight">{produto.name}</h1>

          {avaliacoes.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-gold text-[0.78rem] tracking-[1px]">
                {"★".repeat(Math.round(avgRating ?? 0))}
                {"☆".repeat(5 - Math.round(avgRating ?? 0))}
              </span>
              <span className="font-times text-[0.72rem] text-muted-foreground">({avaliacoes.length} avaliações)</span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-6">
            <span className="font-times text-[1.5rem] font-medium">{formatPrice(produto.price)}</span>
            {produto.oldPrice && (
              <span className="font-times text-[0.85rem] text-muted-foreground line-through">{formatPrice(produto.oldPrice)}</span>
            )}
          </div>

          {produto.description && (
            <p className="text-[0.84rem] font-light leading-[1.85] text-muted-foreground mb-6 whitespace-pre-line">
              {produto.description}
            </p>
          )}

          <p className="text-[0.72rem] text-muted-foreground mb-6">
            {produto.stockQuantity > 0 ? `${produto.stockQuantity} em estoque` : "Esgotado"}
            {produto.city && ` · Enviado de ${produto.city}`}
          </p>

          <div className="flex gap-3">
            <button
              onClick={adicionarAoCarrinho}
              disabled={produto.stockQuantity <= 0}
              className="flex-1 bg-foreground text-background font-body text-[0.72rem] tracking-[0.12em] uppercase font-medium py-3.5 hover:bg-espresso transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {produto.stockQuantity <= 0 ? "Esgotado" : "Adicionar ao carrinho"}
            </button>
            <button
              onClick={() => alternarFavorito(produto.id)}
              aria-label={favorito ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              className={`w-[52px] border border-border flex items-center justify-center text-[1.1rem] hover:bg-parchment transition-colors ${favorito ? "text-terra" : "text-muted-foreground"}`}
            >
              {favorito ? "♥" : "♡"}
            </button>
          </div>
        </div>
      </div>

      {/* Avaliações */}
      {avaliacoes.length > 0 && (
        <section className="mt-14 pt-10 border-t border-border">
          <h2 className="font-display text-[1.3rem] font-light mb-6">Avaliações</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {avaliacoes.map((r) => (
              <div key={r.id} className="border border-border p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-[0.85rem]">{r.name}</div>
                  <div className="text-right">
                    <div className="text-gold text-[0.66rem] tracking-[1px]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                    <div className="text-[0.56rem] text-muted-foreground mt-0.5">
                      {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
                {r.comment && <p className="text-[0.8rem] font-light leading-[1.8] text-muted-foreground">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
