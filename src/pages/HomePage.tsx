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
import { usePecas } from "@/hooks/useCatalogo";

const HomePage = () => {
  const navigate = useNavigate();
  const { pecas, loading } = usePecas();
  const [category, setCategory] = useState("todas");
  const [style, setStyle] = useState<StyleKey>("todos");

  const filtered = useMemo(
    () =>
      pecas.filter(
        (p) =>
          (category === "todas" || p.categorySlug === category) &&
          (style === "todos" || p.badge === style),
      ),
    [pecas, category, style],
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
      <CategoriesSection />
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
      <ArtisansSection />
      <CTASection onNavigate={() => navigate("/painel")} />
      <MarketFooter />
    </>
  );
};

export default HomePage;
