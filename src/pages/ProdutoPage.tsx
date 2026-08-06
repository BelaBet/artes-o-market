import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";
import MarketFooter from "@/components/MarketFooter";
import ShareMenu from "@/components/ShareMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { BADGE_MAP } from "@/lib/data";
import { formatarCentavos, localizacao } from "@/lib/catalogo";
import { usePeca } from "@/hooks/useCatalogo";
import { useCart } from "@/contexts/CartContext";
import { usePageMeta } from "@/hooks/usePageMeta";

const ProdutoPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { peca, loading, naoEncontrada } = usePeca(slug);
  const { addPeca } = useCart();

  usePageMeta(
    peca ? peca.title : "Peça",
    peca
      ? `${peca.title} — feito à mão por ${peca.artisan.shopName}${
          peca.artisan.city ? ` em ${localizacao(peca.artisan.city, peca.artisan.state)}` : ""
        }.`
      : undefined,
  );

  if (naoEncontrada) return <Navigate to="/404" replace />;

  if (loading || !peca) {
    return (
      <div className="max-w-[1100px] mx-auto px-4 md:px-9 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div>
            <Skeleton className="h-[2rem] w-3/4 rounded-none mb-3" />
            <Skeleton className="h-[0.9rem] w-1/2 rounded-none mb-6" />
            <Skeleton className="h-[1.6rem] w-1/3 rounded-none mb-6" />
            <Skeleton className="h-[3rem] w-full rounded-none" />
          </div>
        </div>
      </div>
    );
  }

  const esgotada = peca.stockQuantity <= 0;

  return (
    <>
      <div className="max-w-[1100px] mx-auto px-4 md:px-9 py-6 sm:py-9">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {/* Foto */}
          <div className="aspect-square overflow-hidden relative bg-parchment border border-border">
            {peca.badge && (
              <span
                className={`absolute top-3 left-3 z-[2] text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 ${BADGE_MAP[peca.badge].className}`}
              >
                {BADGE_MAP[peca.badge].label}
              </span>
            )}
            {peca.imageUrl && (
              <ImagemComPlaceholder
                src={peca.imageUrl}
                alt={peca.title}
                tint={peca.tint}
                prioridade
                className="w-full h-full object-cover saturate-[0.9]"
              />
            )}
          </div>

          {/* Informações */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="font-display text-[1.7rem] sm:text-[2.2rem] font-light leading-tight">
                {peca.title}
              </h1>
              <div className="shrink-0 pt-1">
                <ShareMenu title={peca.title} />
              </div>
            </div>

            <div className="text-[0.76rem] text-muted-foreground mb-5">
              por{" "}
              <Link to={`/artesao/${peca.artisan.slug}`} className="text-terra hover:underline">
                {peca.artisan.shopName}
              </Link>
              {peca.artisan.city && ` · ${localizacao(peca.artisan.city, peca.artisan.state)}`}
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display text-[1.7rem] font-light">
                {formatarCentavos(peca.priceCents)}
              </span>
              {peca.compareAtCents && (
                <span className="text-[0.85rem] text-muted-foreground line-through">
                  {formatarCentavos(peca.compareAtCents)}
                </span>
              )}
            </div>

            <div className="text-[0.72rem] tracking-[0.1em] uppercase text-muted-foreground mb-6">
              {peca.stockMode === "unique"
                ? esgotada
                  ? "Peça única — já vendida"
                  : "Peça única"
                : esgotada
                  ? "Esgotada no momento"
                  : `${peca.stockQuantity} disponíveis`}
            </div>

            {peca.description && (
              <p className="text-[0.9rem] font-light leading-[1.8] mb-7 whitespace-pre-wrap">
                {peca.description}
              </p>
            )}

            <button
              onClick={() => addPeca(peca)}
              disabled={esgotada}
              className="w-full bg-espresso text-parchment py-3.5 font-body text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-3"
            >
              {esgotada ? "Peça vendida" : "Adicionar ao carrinho"}
            </button>

            {/* Ponto de entrada do módulo sob medida */}
            <Link
              to={`/projetos-sob-medida/criar?peca=${peca.slug}`}
              className="w-full border border-terra text-terra py-3.5 font-body text-[0.72rem] tracking-[0.14em] uppercase hover:bg-terra hover:text-background transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" /> Quero uma versão personalizada
            </Link>
            <p className="text-[0.76rem] text-muted-foreground font-light mt-2 leading-snug">
              Peça mudanças de tamanho, cor, quantidade ou acabamento — o artesão responde com
              preço e prazo.
            </p>
          </div>
        </div>
      </div>

      <MarketFooter />
    </>
  );
};

export default ProdutoPage;
