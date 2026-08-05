import { useState } from "react";
import { IMAGES, PRODUCTS, BADGE_MAP, formatPrice } from "@/lib/data";
import { useCart } from "@/contexts/CartContext";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";
import ProductGridSkeleton from "@/components/ProductGridSkeleton";

interface ProductGridProps {
  products?: typeof PRODUCTS;
  onAddToCart?: () => void;
  /** exibe o esqueleto no lugar da grade */
  loading?: boolean;
  /** quantos esqueletos mostrar enquanto carrega */
  skeletonCount?: number;
}

const ProductGrid = ({
  products = PRODUCTS,
  onAddToCart,
  loading = false,
  skeletonCount = 8,
}: ProductGridProps) => {
  const { addItem } = useCart();
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const toggleFav = (id: number) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) return <ProductGridSkeleton quantidade={skeletonCount} />;

  if (products.length === 0) {
    return (
      <div className="border border-border bg-background py-16 px-6 text-center">
        <div className="font-display text-[1.15rem] mb-1">Nenhuma peça por aqui</div>
        <p className="text-[0.78rem] text-muted-foreground font-light">
          Tente ajustar os filtros ou explorar outra categoria.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-border border border-border">
      {products.map((p, i) => (
        <div key={p.id} className="bg-background cursor-pointer hover:bg-parchment transition-colors relative group">
          <div className="aspect-square overflow-hidden relative bg-parchment">
            {p.badge && (
              <span className={`absolute top-2 sm:top-2.5 left-2 sm:left-2.5 text-[0.5rem] sm:text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-1.5 sm:px-2 py-0.5 z-[2] ${BADGE_MAP[p.badge].className}`}>
                {BADGE_MAP[p.badge].label}
              </span>
            )}
            <button
              className={`absolute top-2 sm:top-2.5 right-2 sm:right-2.5 bg-background/90 border border-border w-8 h-8 sm:w-7 sm:h-7 rounded-full cursor-pointer text-[0.85rem] sm:text-[0.78rem] flex items-center justify-center transition-all z-[2] hover:bg-background active:scale-90 ${favs.has(p.id) ? "text-terra" : ""}`}
              aria-label={favs.has(p.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
            >
              {favs.has(p.id) ? "♥" : "♡"}
            </button>
            <ImagemComPlaceholder
              src={IMAGES[p.img]}
              alt={p.name}
              tintKey={p.img}
              prioridade={i < 4}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[550ms] saturate-[0.86]"
            />
            <span className="absolute bottom-2 left-2 bg-espresso/70 backdrop-blur px-1.5 sm:px-2 py-0.5 text-[0.45rem] sm:text-[0.52rem] tracking-[0.12em] uppercase text-gold-light font-semibold">
              🇧🇷 Made in Brasil
            </span>
          </div>
          <div className="p-2.5 sm:p-3.5 pb-3 sm:pb-4">
            <div className="font-display font-medium text-[0.85rem] sm:text-[0.98rem] leading-tight mb-1">{p.name}</div>
            <div className="text-[0.6rem] sm:text-[0.67rem] tracking-[0.05em] text-muted-foreground mb-2 sm:mb-3">
              por <strong className="text-terra font-medium">{p.artist}</strong> · {p.city}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-gold text-[0.58rem] sm:text-[0.64rem] tracking-[1px]">
                  {"★".repeat(p.stars)}{"☆".repeat(5 - p.stars)}
                  <span className="text-muted-foreground text-[0.55rem] sm:text-[0.61rem] ml-0.5 tracking-normal">({p.reviews})</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-display text-[0.98rem] sm:text-[1.15rem] font-medium">{formatPrice(p.price)}</span>
                  {p.oldPrice && <span className="text-[0.6rem] sm:text-[0.7rem] text-muted-foreground line-through">{formatPrice(p.oldPrice)}</span>}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); addItem(p.id); onAddToCart?.(); }}
                className="bg-transparent border border-border cursor-pointer w-full sm:w-auto px-3 py-2 sm:py-1 font-body text-[0.62rem] sm:text-[0.6rem] tracking-[0.12em] uppercase font-medium hover:bg-foreground hover:text-background hover:border-foreground active:bg-foreground active:text-background transition-all shrink-0"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductGrid;
