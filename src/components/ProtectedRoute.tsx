import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Pra onde mandar quem não está logado. "/painel" (artesão) usa /entrar; o resto (checkout, mensagens) usa /login. */
  redirectTo?: string;
}

const ProtectedRoute = ({ children, redirectTo = "/login" }: ProtectedRouteProps) => {
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
    // /login lê o destino por query string (?next=); /entrar lê por state.from.
    if (redirectTo === "/login") {
      return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    }
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
