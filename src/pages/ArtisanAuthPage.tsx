import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePageMeta } from "@/hooks/usePageMeta";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo =
  "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

// Mensagens do Supabase chegam em inglês e técnicas demais para quem
// está criando a primeira conta.
function mensagemAmigavel(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (m.includes("password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não conseguimos concluir agora. Tente novamente em instantes.";
}

const ArtisanAuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Volta para a página que exigiu login, se houver.
  const from = (location.state as { from?: string } | null)?.from ?? "/painel";
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  usePageMeta("Painel do Artesão", "Acesse sua loja e gerencie seus produtos no Artes o Market.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Proteção contra duplo envio: o botão já fica desabilitado, mas o
    // Enter no teclado do celular consegue disparar duas vezes.
    if (loading) return;
    setErro(null);

    if (mode === "register") {
      if (password !== confirmacao) {
        setErro("As senhas não são iguais. Confira e tente de novo.");
        return;
      }
      if (!aceitouTermos) {
        setErro("Para criar sua conta, aceite os termos de uso.");
        return;
      }
    }

    setLoading(true);

    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/entrar`,
      });
      if (error) setErro(mensagemAmigavel(error.message));
      else toast.success("Enviamos um link de recuperação para o seu e-mail.");
      setLoading(false);
      return;
    }

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
        setErro(mensagemAmigavel(error.message));
      } else {
        toast.success("Conta criada! 🎉");
        navigate(from, { replace: true });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErro(mensagemAmigavel(error.message));
      } else {
        toast.success("Bem-vindo de volta!");
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
            {mode === "login" && "Acesse sua loja e gerencie seus produtos"}
            {mode === "register" && "Crie sua conta e comece a vender seu artesanato"}
            {mode === "recover" && "Informe seu e-mail para receber um link de recuperação"}
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
                className={campo}
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
              className={campo}
              placeholder="seu@email.com"
              autoComplete="email"
              required
            />
          </div>
          {mode !== "recover" && (
            <div className="mb-5">
              <label className={rotulo} htmlFor="senha">Senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${campo} pr-11`}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div className="mb-5">
              <label className={rotulo} htmlFor="confirmacao">Repita a senha</label>
              <input
                id="confirmacao"
                type={mostrarSenha ? "text" : "password"}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className={campo}
                placeholder="Digite a senha de novo"
                required
                minLength={6}
                autoComplete="new-password"
              />
              {confirmacao && password !== confirmacao && (
                <p className="text-[0.7rem] text-destructive mt-1.5">As senhas não são iguais.</p>
              )}
            </div>
          )}

          {mode === "register" && (
            <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-terra shrink-0"
              />
              <span className="text-[0.74rem] text-muted-foreground font-light leading-snug">
                Li e aceito os termos de uso e a política de privacidade.
              </span>
            </label>
          )}

          {erro && (
            <div
              role="alert"
              className="mb-5 border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-[0.76rem] text-destructive leading-snug"
            >
              {erro}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            {loading
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : mode === "register"
                  ? "Criar minha conta"
                  : "Enviar link de recuperação"}
          </button>
        </form>

        {mode === "login" && (
          <div className="text-center mt-4">
            <button
              onClick={() => { setMode("recover"); setErro(null); }}
              className="bg-transparent border-none cursor-pointer font-body text-[0.74rem] text-muted-foreground hover:text-terra transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>
        )}

        <div className="text-center mt-5">
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setErro(null); }}
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
