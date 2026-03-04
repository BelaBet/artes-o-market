import { useState } from "react";
import MarketHeader from "@/components/MarketHeader";
import HeroSection from "@/components/HeroSection";
import MarqueeStrip from "@/components/MarqueeStrip";
import TextureBand from "@/components/TextureBand";
import StorySection from "@/components/StorySection";
import ShippingSection from "@/components/ShippingSection";
import CategoriesSection from "@/components/CategoriesSection";
import ProductGrid from "@/components/ProductGrid";
import ArtisansSection from "@/components/ArtisansSection";
import CTASection from "@/components/CTASection";
import MarketFooter from "@/components/MarketFooter";
import CatalogPage from "@/pages/CatalogPage";
import DashboardPage from "@/pages/DashboardPage";
import ChatPage from "@/pages/ChatPage";

const Index = () => {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState(2);

  return (
    <div>
      <div className="grain-overlay" />
      <MarketHeader currentPage={page} onNavigate={setPage} cartCount={cart} />

      {page === "home" && (
        <>
          <HeroSection onExplore={() => setPage("catalog")} />
          <MarqueeStrip />
          <TextureBand />
          <StorySection />
          <ShippingSection />
          <CategoriesSection onNavigate={() => setPage("catalog")} />
          <section className="px-9 pb-16">
            <div className="max-w-[1320px] mx-auto">
              <div className="flex items-end justify-between mb-8 pb-3 border-b border-border">
                <div>
                  <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-2">Curadoria</div>
                  <h2 className="font-display font-normal text-[2.1rem] leading-[1.15]">
                    Peças <em className="italic text-terra">em destaque</em>
                  </h2>
                </div>
                <button onClick={() => setPage("catalog")} className="bg-transparent border-none cursor-pointer font-body text-[0.66rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-terra transition-colors">
                  Ver todos →
                </button>
              </div>
              <ProductGrid onAddToCart={() => setCart(c => c + 1)} />
            </div>
          </section>
          <ArtisansSection />
          <CTASection onNavigate={() => setPage("dashboard")} />
          <MarketFooter />
        </>
      )}

      {page === "catalog" && <CatalogPage onAddToCart={() => setCart(c => c + 1)} />}
      {page === "dashboard" && <DashboardPage />}
      {page === "chat" && <ChatPage />}
    </div>
  );
};

export default Index;
