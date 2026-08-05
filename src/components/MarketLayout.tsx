import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import MarketHeader from "@/components/MarketHeader";

const MarketLayout = () => {
  const { pathname } = useLocation();

  // Sem isso, ao navegar entre rotas o scroll permanece onde estava.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div>
      <div className="grain-overlay" />
      <MarketHeader />
      <Outlet />
    </div>
  );
};

export default MarketLayout;
