import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import MarketLayout from "@/components/MarketLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CatalogPage from "./pages/CatalogPage";
import ExperiencesPage from "./pages/ExperiencesPage";
import ArtisanProfilePage from "./pages/ArtisanProfilePage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import ArtisanAuthPage from "./pages/ArtisanAuthPage";
import NotFound from "./pages/NotFound";
import ProjetosSobMedidaPage from "./pages/ProjetosSobMedidaPage";
import CriarProjetoPage from "./pages/CriarProjetoPage";
import ProdutoPage from "./pages/ProdutoPage";
import RedefinirSenhaPage from "./pages/RedefinirSenhaPage";
import AdminRecebedoresPage from "./pages/AdminRecebedoresPage";
import { MeusProjetosPage, ProjetoDetalhePage } from "./pages/MeusProjetosPage";
import LoginPage from "./pages/LoginPage";
import OAuthConsent from "./pages/OAuthConsent";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <CartDrawer />
            <Routes>
              {/* Rotas com header do marketplace */}
              <Route element={<MarketLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/catalogo" element={<CatalogPage />} />
                <Route path="/experiencias" element={<ExperiencesPage />} />
                <Route path="/artesao/:slug" element={<ArtisanProfilePage />} />
                <Route path="/produto/:slug" element={<ProdutoPage />} />
                <Route path="/projetos-sob-medida" element={<ProjetosSobMedidaPage />} />
                <Route path="/projetos-sob-medida/criar" element={<CriarProjetoPage />} />
                <Route
                  path="/admin/recebedores"
                  element={
                    <ProtectedRoute>
                      <AdminRecebedoresPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/minha-conta/projetos"
                  element={
                    <ProtectedRoute>
                      <MeusProjetosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/minha-conta/projetos/:id"
                  element={
                    <ProtectedRoute>
                      <ProjetoDetalhePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/painel"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/mensagens"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Rotas sem header */}
              <Route path="/entrar" element={<ArtisanAuthPage />} />
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
