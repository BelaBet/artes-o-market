import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { formatPrice, BADGE_MAP } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useCart } from "@/contexts/CartContext";
import { useArtesaoPorSlug, useAvaliacoesDoArtesao } from "@/hooks/useArtesaos";
import { useProdutosDoArtesao } from "@/hooks/useProdutos";
import { useIniciarConversa } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";
import { Skeleton } from "@/components/ui/skeleton";

const ArtisanProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { user } = useAuth();
  const iniciarConversa = useIniciarConversa();
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const { artesao, loading: carregandoArtesao } = useArtesaoPorSlug(slug);
  const { produtos: artisanProducts, loading: carregandoProdutos } = useProdutosDoArtesao(artesao?.id);
  const { avaliacoes: reviews } = useAvaliacoesDoArtesao(artesao?.id);

  const enviarMensagem = async () => {
    if (!artesao) return;
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/artesao/${artesao.slug}`)}`);
      return;
    }
    const conversaId = await iniciarConversa(artesao.id);
    if (conversaId) navigate(`/mensagens?conversa=${conversaId}`);
  };

  usePageMeta(
    artesao ? `${artesao.name} — ${artesao.spec}` : "Artesão",
    artesao ? `Conheça o trabalho de ${artesao.name}, artesão em ${artesao.loc}. ${artesao.spec}.` : undefined,
  );

  if (carregandoArtesao) {
    return (
      <div className="min-h-[80vh] p-9">
        <Skeleton className="h-[320px] w-full rounded-none mb-8" />
      </div>
    );
  }

  // Slug inexistente cai no 404 em vez de quebrar em runtime.
  if (!artesao) return <Navigate to="/404" replace />;

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const toggleFav = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="min-h-[80vh]">
      {/* Hero banner */}
      <div className="relative h-[320px] overflow-hidden">
        <ImagemComPlaceholder
          src={artesao.img ?? undefined}
          alt={artesao.name}
          prioridade
          className="w-full h-full object-cover brightness-[0.4] saturate-[0.6]"
        />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1320px] mx-auto w-full px-9 pb-10">
            <button
              onClick={() => navigate(-1)}
              className="bg-parchment/10 backdrop-blur border border-parchment/20 text-parchment px-4 py-1.5 font-body text-[0.64rem] tracking-[0.12em] uppercase cursor-pointer hover:bg-parchment/20 transition-colors mb-6"
            >
              ← Voltar
            </button>
            <div className="flex items-end gap-6">
              <div className="w-[100px] h-[100px] rounded-full border-[3px] border-parchment/30 overflow-hidden shrink-0 bg-parchment/10">
                {artesao.img && <img src={artesao.img} alt={artesao.name} className="w-full h-full object-cover" />}
              </div>
              <div>
                <div className="font-display text-[2.4rem] text-parchment font-light leading-tight">
                  {artesao.name}
                  {artesao.verified && <span className="text-[0.7rem] text-sage font-body ml-2">✓ Verificado</span>}
                </div>
                <div className="text-[0.72rem] tracking-[0.08em] text-parchment/50 mt-1">
                  📍 {artesao.loc} · <span className="text-gold-light italic font-display text-[0.85rem]">{artesao.spec}</span>
                </div>
                <div className="flex gap-6 mt-3">
                  {[
                    { v: avgRating ?? "—", l: "Avaliação" },
                    { v: String(artisanProducts.length), l: "Produtos" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="font-display text-[1.3rem] text-gold-light font-light">{s.v}</span>
                      <span className="text-[0.56rem] tracking-[0.12em] uppercase text-parchment/30">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="bg-parchment border-b border-border">
        <div className="max-w-[1320px] mx-auto px-9 py-8 flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="text-[0.6rem] tracking-[0.2em] uppercase text-terra mb-2">Sobre o artesão</div>
            <p className="text-[0.86rem] font-light leading-[1.9] text-muted-foreground max-w-[600px]">
              {artesao.bio || "Este artesão ainda não contou sua história."}
            </p>
          </div>
          <button
            onClick={enviarMensagem}
            className="bg-terra text-background border-none px-6 py-2.5 cursor-pointer font-body font-medium text-[0.66rem] tracking-[0.14em] uppercase hover:brightness-90 transition-colors"
          >
            Enviar Mensagem
          </button>
        </div>
      </div>

      {/* Products */}
      <section className="py-10 sm:py-12 px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-7 sm:mb-8 pb-3 border-b border-border">
            <div>
              <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-terra mb-2">Loja</div>
              <h2 className="font-display font-normal text-[1.55rem] sm:text-[2rem] leading-[1.15]">
                Produtos de <em className="italic text-terra">{artesao.name}</em>
              </h2>
            </div>
            <span className="font-display text-[0.85rem] sm:text-[0.9rem] text-muted-foreground">{artisanProducts.length} produtos</span>
          </div>
          {carregandoProdutos ? (
            <Skeleton className="h-[240px] w-full rounded-none" />
          ) : artisanProducts.length === 0 ? (
            <p className="text-[0.82rem] text-muted-foreground">Esta loja ainda não publicou produtos.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artisanProducts.map((p) => (
                <div key={p.id} className="bg-background cursor-pointer border border-border border-r-0 border-b-0 last:border-r hover:bg-parchment transition-colors relative group">
                  <div className="aspect-square overflow-hidden relative bg-parchment">
                    {p.badge && (
                      <span className={`absolute top-2.5 left-2.5 text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 z-[2] ${BADGE_MAP[p.badge].className}`}>
                        {BADGE_MAP[p.badge].label}
                      </span>
                    )}
                    <button
                      className={`absolute top-2.5 right-2.5 bg-background/90 border border-border w-7 h-7 rounded-full cursor-pointer text-[0.78rem] flex items-center justify-center transition-all z-[2] hover:bg-background ${favs.has(p.id) ? "text-terra" : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                    >
                      {favs.has(p.id) ? "♥" : "♡"}
                    </button>
                    <ImagemComPlaceholder
                      src={p.img ?? undefined}
                      alt={p.name}
                      tint={p.tint}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-[550ms] saturate-[0.86]"
                    />
                  </div>
                  <div className="p-3 sm:p-3.5 pb-4">
                    <div className="font-display font-medium text-[0.92rem] sm:text-[0.98rem] leading-tight mb-1">{p.name}</div>
                    <div className="text-[0.64rem] sm:text-[0.67rem] tracking-[0.05em] text-muted-foreground mb-3">{p.city}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        {p.reviews > 0 && (
                          <div className="text-gold text-[0.62rem] sm:text-[0.64rem] tracking-[1px]">
                            {"★".repeat(p.stars)}{"☆".repeat(5 - p.stars)}
                            <span className="text-muted-foreground text-[0.6rem] ml-0.5 tracking-normal">({p.reviews})</span>
                          </div>
                        )}
                        <span className="font-display text-[1.05rem] sm:text-[1.15rem] font-medium">{formatPrice(p.price)}</span>
                        {p.oldPrice && <span className="text-[0.68rem] sm:text-[0.7rem] text-muted-foreground line-through ml-1">{formatPrice(p.oldPrice)}</span>}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); addItem(p); }}
                        disabled={p.stockQuantity <= 0}
                        className="bg-transparent border border-border cursor-pointer px-3 py-1 font-body text-[0.58rem] sm:text-[0.6rem] tracking-[0.12em] uppercase font-medium hover:bg-foreground hover:text-background hover:border-foreground transition-all self-start sm:self-auto disabled:opacity-40"
                      >
                        {p.stockQuantity <= 0 ? "Esgotado" : "Adicionar"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="py-10 sm:py-12 px-4 md:px-9 bg-parchment">
          <div className="max-w-[1320px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-7 sm:mb-8 pb-3 border-b border-border">
              <div>
                <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-terra mb-2">Avaliações</div>
                <h2 className="font-display font-normal text-[1.55rem] sm:text-[2rem] leading-[1.15]">
                  O que dizem sobre <em className="italic text-terra">{artesao.name}</em>
                </h2>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-display text-[1.8rem] sm:text-[2.2rem] text-terra font-light leading-tight">{avgRating}</div>
                <div className="text-gold text-[0.7rem] sm:text-[0.72rem] tracking-[1px]">{"★".repeat(Math.round(Number(avgRating)))}</div>
                <div className="text-[0.6rem] text-muted-foreground tracking-[0.08em]">{reviews.length} avaliações</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((r) => (
                <div key={r.id} className="bg-background border border-border p-5 sm:p-6 hover:border-terra/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-[0.85rem]">{r.name}</div>
                      {r.city && <div className="text-[0.64rem] text-muted-foreground tracking-[0.06em]">📍 {r.city}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-gold text-[0.68rem] tracking-[1px]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
                      <div className="text-[0.58rem] text-muted-foreground mt-0.5">
                        {new Date(r.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  {r.product && (
                    <div className="inline-block text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 bg-terra/10 text-terra mb-3">
                      {r.product}
                    </div>
                  )}
                  {r.comment && <p className="text-[0.82rem] font-light leading-[1.8] text-muted-foreground">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ArtisanProfilePage;
