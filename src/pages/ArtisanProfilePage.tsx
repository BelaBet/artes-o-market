import { Navigate, useNavigate, useParams } from "react-router-dom";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";
import ProductGrid from "@/components/ProductGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { localizacao } from "@/lib/catalogo";
import { useArtesao, useAvaliacoes, usePecas } from "@/hooks/useCatalogo";
import { usePageMeta } from "@/hooks/usePageMeta";

const Estrelas = ({ nota }: { nota: number }) => (
  <span className="text-gold text-[0.64rem] tracking-[1px]">
    {"★".repeat(nota)}
    {"☆".repeat(5 - nota)}
  </span>
);

const ArtisanProfilePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { artesao, loading, naoEncontrado } = useArtesao(slug);
  const { pecas, loading: carregandoPecas } = usePecas({ artisanSlug: slug });
  const { avaliacoes } = useAvaliacoes(artesao?.id);

  usePageMeta(
    artesao ? `${artesao.shopName}${artesao.headline ? ` — ${artesao.headline}` : ""}` : "Artesão",
    artesao
      ? `Conheça o trabalho de ${artesao.shopName}, em ${localizacao(artesao.city, artesao.state)}.`
      : undefined,
  );

  if (naoEncontrado) return <Navigate to="/404" replace />;

  if (loading || !artesao) {
    return (
      <div className="min-h-[80vh]">
        <Skeleton className="h-[320px] w-full rounded-none" />
        <div className="max-w-[1320px] mx-auto px-4 md:px-9 py-8">
          <Skeleton className="h-[2rem] w-1/3 rounded-none mb-3" />
          <Skeleton className="h-[0.9rem] w-1/4 rounded-none mb-8" />
          <ProductGrid loading skeletonCount={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      {/* Capa */}
      <div className="relative h-[260px] sm:h-[320px] overflow-hidden bg-espresso">
        {artesao.coverUrl && (
          <ImagemComPlaceholder
            src={artesao.coverUrl}
            alt={artesao.shopName}
            prioridade
            className="w-full h-full object-cover brightness-[0.4] saturate-[0.6]"
          />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1320px] mx-auto w-full px-4 md:px-9 pb-6 sm:pb-10">
            <button
              onClick={() => navigate(-1)}
              className="bg-parchment/10 backdrop-blur border border-parchment/20 text-parchment px-4 py-1.5 font-body text-[0.64rem] tracking-[0.12em] uppercase cursor-pointer hover:bg-parchment/20 transition-colors mb-4 sm:mb-6"
            >
              ← Voltar
            </button>

            <div className="flex items-end gap-4 sm:gap-6">
              <div className="w-[72px] h-[72px] sm:w-[100px] sm:h-[100px] rounded-full border-[3px] border-parchment/30 overflow-hidden shrink-0 bg-espresso relative">
                {artesao.avatarUrl && (
                  <ImagemComPlaceholder
                    src={artesao.avatarUrl}
                    alt={artesao.shopName}
                    prioridade
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="font-display text-[1.6rem] sm:text-[2.4rem] text-parchment font-light leading-tight">
                  {artesao.shopName}
                  {artesao.verified && (
                    <span className="text-[0.6rem] sm:text-[0.7rem] text-sage font-body ml-2">✓ Verificado</span>
                  )}
                </div>
                <div className="text-[0.68rem] sm:text-[0.72rem] tracking-[0.08em] text-parchment/50 mt-1">
                  📍 {localizacao(artesao.city, artesao.state)}
                  {artesao.headline && (
                    <>
                      {" · "}
                      <span className="text-gold-light italic font-display text-[0.85rem]">
                        {artesao.headline}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex gap-5 sm:gap-6 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display text-[1.1rem] sm:text-[1.3rem] text-gold-light font-light">
                      {pecas.length}
                    </span>
                    <span className="text-[0.56rem] tracking-[0.12em] uppercase text-parchment/30">
                      {pecas.length === 1 ? "Peça" : "Peças"}
                    </span>
                  </div>
                  {artesao.reviewCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-[1.1rem] sm:text-[1.3rem] text-gold-light font-light">
                        {artesao.averageRating?.toFixed(1)}
                      </span>
                      <span className="text-[0.56rem] tracking-[0.12em] uppercase text-parchment/30">
                        Avaliação
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {artesao.bio && (
        <div className="bg-parchment border-b border-border">
          <div className="max-w-[1320px] mx-auto px-4 md:px-9 py-7 sm:py-8">
            <div className="text-[0.6rem] tracking-[0.2em] uppercase text-terra mb-2">Sobre</div>
            <p className="font-light text-[0.88rem] sm:text-[0.95rem] leading-[1.8] max-w-[720px]">
              {artesao.bio}
            </p>
          </div>
        </div>
      )}

      {/* Peças */}
      <div className="max-w-[1320px] mx-auto px-4 md:px-9 py-8 sm:py-10">
        <div className="pb-3 mb-6 border-b border-border">
          <h2 className="font-display font-normal text-[1.4rem] sm:text-[1.8rem]">
            Peças <em className="italic text-terra">deste ateliê</em>
          </h2>
        </div>
        <ProductGrid
          products={pecas}
          loading={carregandoPecas}
          skeletonCount={4}
          mensagemVazia="Este ateliê ainda não publicou peças."
        />
      </div>

      {/* Avaliações */}
      <div className="bg-parchment border-t border-border">
        <div className="max-w-[1320px] mx-auto px-4 md:px-9 py-8 sm:py-10">
          <div className="pb-3 mb-6 border-b border-border">
            <h2 className="font-display font-normal text-[1.3rem] sm:text-[1.6rem]">
              O que dizem <em className="italic text-terra">quem comprou</em>
            </h2>
          </div>

          {avaliacoes.length === 0 ? (
            <p className="text-[0.82rem] text-muted-foreground font-light py-4">
              Ainda não há avaliações. Elas aparecem aqui depois que um pedido é entregue —
              só quem comprou pode avaliar.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {avaliacoes.map((r) => (
                <div key={r.id} className="bg-background border border-border p-5">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <Estrelas nota={r.rating} />
                    <span className="text-[0.6rem] tracking-[0.1em] uppercase text-sage">
                      ✓ {r.autor}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-[0.85rem] font-light leading-[1.7]">{r.comment}</p>
                  )}
                  {r.artisanReply && (
                    <div className="mt-3 pl-3 border-l-2 border-terra/40">
                      <div className="text-[0.58rem] tracking-[0.14em] uppercase text-terra mb-1">
                        Resposta do ateliê
                      </div>
                      <p className="text-[0.8rem] font-light leading-[1.6] text-muted-foreground">
                        {r.artisanReply}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtisanProfilePage;
