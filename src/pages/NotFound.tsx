import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";

const NotFound = () => {
  const location = useLocation();
  usePageMeta("Página não encontrada");

  useEffect(() => {
    console.error("404: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-parchment px-4">
      <div className="text-center">
        <div className="font-display text-[3.4rem] font-light mb-2">404</div>
        <p className="mb-6 text-[0.86rem] text-muted-foreground font-light">
          Essa página não existe — ou foi feita à mão em outro lugar.
        </p>
        <Link
          to="/"
          className="inline-block border border-foreground px-6 py-2.5 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:bg-foreground hover:text-background transition-colors"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
