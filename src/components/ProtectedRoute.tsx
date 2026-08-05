import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Enquanto a sessão não resolve, não redireciona — senão o usuário
  // logado é chutado para /entrar a cada refresh.
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[0.7rem] tracking-[0.16em] uppercase text-muted-foreground">
          Carregando…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
