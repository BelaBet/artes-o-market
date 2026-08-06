import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import MarqueeStrip from "@/components/MarqueeStrip";
import TextureBand from "@/components/TextureBand";
import StorySection from "@/components/StorySection";
import ShippingSection from "@/components/ShippingSection";
import CategoriesSection from "@/components/CategoriesSection";
import ProductGrid from "@/components/ProductGrid";
import FeaturedFilters, { type StyleKey } from "@/components/FeaturedFilters";
import ArtisansSection from "@/components/ArtisansSection";
import CTASection from "@/components/CTASection";
import MarketFooter from "@/components/MarketFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useProdutos } from "@/hooks/useProdutos";

const HomePage = () => {
  const navigate = useNavigate();
  const { produtos, loading } = useProdutos();
  const [category, setCategory] = useState("todas");
  const [style, setStyle] = useState<StyleKey>("todos");

  const filtered = useMemo(
    () =>
      produtos.filter(
        (p) =>
          (category === "todas" || p.img === category) &&
          (style === "todos" || p.badge === style),
      ),
    [produtos, category, style],
  );

  usePageMeta(
    "Artesanato brasileiro feito à mão",
    "Marketplace de artesanato brasileiro: peças únicas feitas à mão por artesãos de todo o Brasil, com envio para mais de 50 países.",
  );


  return (
    <>
      <HeroSection onExplore={() => navigate("/catalogo")} />
      <MarqueeStrip />
      <TextureBand />
      <StorySection />
      <ShippingSection />
      <CategoriesSection onNavigate={() => navigate("/catalogo")} />
      <section className="px-4 sm:px-6 lg:px-9 pb-12 sm:pb-16">
        <div className="max-w-[1320px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 pb-3 border-b border-border">
            <div>
              <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-1.5 sm:mb-2">Curadoria</div>
              <h2 className="font-display font-normal text-[1.65rem] sm:text-[2.1rem] leading-[1.15]">
                Peças <em className="italic text-terra">em destaque</em>
              </h2>
            </div>
            <Link
              to="/catalogo"
              className="self-start sm:self-auto font-body text-[0.62rem] sm:text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-terra transition-colors"
            >
              Ver todos →
            </Link>
          </div>
          <FeaturedFilters
            category={category}
            style={style}
            onCategoryChange={setCategory}
            onStyleChange={setStyle}
            resultCount={filtered.length}
            onClear={() => {
              setCategory("todas");
              setStyle("todos");
            }}
          />
          {loading || filtered.length > 0 ? (
            <ProductGrid products={filtered} loading={loading} />
          ) : (
            <div className="border border-border py-12 px-4 text-center">
              <p className="font-display text-[1.05rem] mb-1">Nenhuma peça com esses filtros</p>
              <p className="font-body text-[0.68rem] text-muted-foreground">
                Tente outra categoria ou estilo.
              </p>
            </div>
          )}
        </div>
      </section>
      {/* Ponto de entrada dos Projetos Sob Medida */}
      <section className="px-4 md:px-9 pb-12 sm:pb-16">
        <div className="max-w-[1320px] mx-auto border border-border bg-parchment px-6 sm:px-10 py-9 sm:py-12 text-center">
          <div className="font-body text-[0.6rem] tracking-[0.2em] uppercase text-terra mb-2">
            Projetos sob medida
          </div>
          <h2 className="font-display text-[1.6rem] sm:text-[2.1rem] font-light leading-tight mb-3">
            Não encontrou exatamente <em className="italic text-terra">o que procura</em>?
          </h2>
          <p className="text-[0.88rem] font-light leading-[1.75] text-muted-foreground max-w-[520px] mx-auto mb-6">
            Conte sua ideia. Nós ajudamos a organizar o pedido e encontramos artesãos que possam
            produzir — mesmo que você não saiba o nome da técnica ou do material.
          </p>
          <Link
            to="/projetos-sob-medida"
            className="inline-block bg-espresso text-parchment px-7 py-3.5 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
          >
            Criar projeto sob medida
          </Link>
        </div>
      </section>

      <ArtisansSection />
      <CTASection onNavigate={() => navigate("/painel")} />
      <MarketFooter />
    </>
  );
};

export default HomePage;
