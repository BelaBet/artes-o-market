import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

const ArtisanAuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Volta para a página que exigiu login, se houver.
  const from = (location.state as { from?: string } | null)?.from ?? "/painel";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  usePageMeta("Painel do Artesão", "Acesse sua loja e gerencie seus produtos no Artes o Market.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
        navigate(from, { replace: true });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Login realizado com sucesso!");
        navigate(from, { replace: true });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <div className="font-display font-semibold text-[2rem] mb-2">
            Feito <em className="italic text-terra">à Mão</em>
          </div>
          <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-3">Painel do Artesão</div>
          <p className="text-[0.84rem] text-muted-foreground font-light">
            {mode === "login"
              ? "Acesse sua loja e gerencie seus produtos"
              : "Crie sua conta e comece a vender seu artesanato"
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-background border border-border p-8">
          {mode === "register" && (
            <div className="mb-5">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Nome do Artesão
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
                placeholder="Seu nome ou nome da loja"
                required
              />
            </div>
          )}
          <div className="mb-5">
            <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="mb-7">
            <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar Conta"}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="bg-transparent border-none cursor-pointer font-body text-[0.76rem] text-muted-foreground hover:text-terra transition-colors"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
          </button>
        </div>
        <div className="text-center mt-3">
          <button
            onClick={() => navigate("/")}
            className="bg-transparent border-none cursor-pointer font-body text-[0.68rem] text-muted-foreground hover:text-foreground transition-colors tracking-[0.08em]"
          >
            ← Voltar ao marketplace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtisanAuthPage;
