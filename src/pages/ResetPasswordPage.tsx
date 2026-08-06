import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function mensagemAmigavel(mensagem: string): string {
  const m = mensagem.toLowerCase();
  if (m.includes("pwned") || m.includes("known to be weak") || m.includes("weak password"))
    return "Essa senha já apareceu em vazamentos de dados. Escolha uma senha diferente.";
  if (m.includes("should be at least") || m.includes("at least 6"))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("password")) return "Não conseguimos usar essa senha. Tente outra.";
  if (m.includes("token") || m.includes("expired") || m.includes("invalid"))
    return "O link de recuperação expirou ou é inválido. Solicite um novo.";
  return "Não conseguimos redefinir a senha. Tente novamente.";
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recuperando, setRecuperando] = useState(true);
  const [valido, setValido] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token=")) {
      setValido(true);
    }
    setRecuperando(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErro(null);

    if (password !== confirmacao) {
      setErro("As senhas não são iguais.");
      return;
    }
    if (password.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErro(mensagemAmigavel(error.message));
    } else {
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    }
    setLoading(false);
  };

  if (recuperando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <p className="text-[0.84rem] text-muted-foreground font-light">Verificando link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <div className="font-display font-semibold text-[2rem] mb-2">
            Feito <em className="italic text-terra">à Mão</em>
          </div>
          <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-3">
            Redefinir Senha
          </div>
        </div>

        {!valido ? (
          <div className="bg-background border border-border p-8 text-center">
            <p className="text-[0.84rem] text-muted-foreground font-light mb-6">
              O link de recuperação não é válido ou expirou.
            </p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-background border border-border p-8">
            <div className="mb-5">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border bg-transparent pl-3 pr-10 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
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

            <div className="mb-7">
              <label className="block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2">
                Repita a nova senha
              </label>
              <input
                type={mostrarSenha ? "text" : "password"}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                className="w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors"
                placeholder="Digite a senha de novo"
                required
                minLength={6}
                autoComplete="new-password"
              />
              {confirmacao && password !== confirmacao && (
                <p className="text-[0.7rem] text-destructive mt-1.5">As senhas não são iguais.</p>
              )}
            </div>

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
              {loading ? "Aguarde..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
