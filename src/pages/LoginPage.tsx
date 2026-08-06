import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Only allow same-origin, path-only redirects.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  try {
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
  } catch {
    return "/";
  }
}

function mensagemAmigavel(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("already registered")) return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  if (m.includes("pwned") || m.includes("known to be weak") || m.includes("weak password"))
    return "Essa senha já apareceu em vazamentos de dados e não é segura. Escolha uma senha diferente — de preferência uma frase com palavras suas, como “panela-de-barro-2019”.";
  if (m.includes("should be at least") || m.includes("at least 6"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("password")) return "Não conseguimos usar essa senha. Tente outra.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return "Não conseguimos concluir agora. Tente novamente em instantes.";
}

const LoginPage = () => {
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(next);
    });
  }, [next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErro(null);
    setLoading(true);

    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setErro(mensagemAmigavel(error.message));
      } else {
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
      }
      setLoading(false);
      return;
    }

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}${next}`,
        },
      });
      if (error) {
        setErro(mensagemAmigavel(error.message));
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
        window.location.replace(next);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErro(mensagemAmigavel(error.message));
      } else {
        toast.success("Bem-vindo de volta!");
        window.location.replace(next);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <div className="font-display font-semibold text-[2rem] mb-2">
            Feito <em className="italic text-terra">à Mão</em>
          </div>
          <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-3">
            {mode === "login" && "Entrar"}
            {mode === "register" && "Criar Conta"}
            {mode === "recover" && "Recuperar Senha"}
          </div>
        </div>
        <form onSubmit={handleSubmit} className="bg-background border border-border p-8">
          {mode === "register" && (
            <div className="mb-5">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Nome
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
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
              required
            />
          </div>
          {mode !== "recover" && (
            <div className="mb-7">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border bg-transparent pl-3 pr-10 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((s) => !s)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-terra transition-colors"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
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
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : mode === "register"
                  ? "Criar Conta"
                  : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="text-center mt-5 flex flex-col gap-1.5">
          {mode === "login" && (
            <button
              onClick={() => setMode("recover")}
              className="bg-transparent border-none cursor-pointer font-body text-[0.74rem] text-muted-foreground hover:text-terra transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
          {mode === "recover" && (
            <button
              onClick={() => setMode("login")}
              className="bg-transparent border-none cursor-pointer font-body text-[0.74rem] text-muted-foreground hover:text-terra transition-colors"
            >
              Voltar para o login
            </button>
          )}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="bg-transparent border-none cursor-pointer font-body text-[0.76rem] text-muted-foreground hover:text-terra transition-colors"
          >
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

