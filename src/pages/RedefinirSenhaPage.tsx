import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

/**
 * Tela para definir a senha nova.
 *
 * O Supabase entrega a sessão de recuperação pelo link do e-mail e emite
 * PASSWORD_RECOVERY. Sem esta página, o link cai em /entrar e não
 * acontece nada — que é como estava.
 */
const RedefinirSenhaPage = () => {
  const navigate = useNavigate();
  usePageMeta("Nova senha");

  const [pronta, setPronta] = useState(false);
  const [linkInvalido, setLinkInvalido] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronta(true);
    });

    // O evento pode ter disparado antes deste componente montar.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPronta(true);
      else setLinkInvalido(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não são iguais. Confira e tente de novo.");
      return;
    }

    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);

    if (error) {
      setErro(
        error.message.toLowerCase().includes("same")
          ? "Escolha uma senha diferente da anterior."
          : "Não conseguimos alterar sua senha agora. Tente novamente.",
      );
      return;
    }

    toast.success("Senha alterada! 🎉");
    navigate("/painel", { replace: true });
  };

  if (linkInvalido && !pronta) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] text-center">
          <h1 className="font-display text-[1.6rem] font-light mb-3">Link expirado</h1>
          <p className="text-[0.86rem] font-light leading-[1.7] text-muted-foreground mb-6">
            Este link de recuperação já foi usado ou passou da validade. Peça um novo — leva
            um minuto.
          </p>
          <button
            onClick={() => navigate("/entrar")}
            className="bg-espresso text-parchment px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
          >
            Pedir novo link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <h1 className="font-display text-[1.7rem] font-light mb-1">Criar uma nova senha</h1>
        <p className="text-[0.84rem] font-light text-muted-foreground mb-7">
          Escolha uma senha que você vá lembrar. Depois disso, você já entra direto.
        </p>

        <form onSubmit={salvar}>
          <div className="mb-5">
            <label className={rotulo} htmlFor="senha">Nova senha</label>
            <div className="relative">
              <input
                id="senha"
                type={mostrar ? "text" : "password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={`${campo} pr-11`}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {mostrar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className={rotulo} htmlFor="confirmacao">Repita a senha</label>
            <input
              id="confirmacao"
              type={mostrar ? "text" : "password"}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className={campo}
              placeholder="Digite a senha de novo"
              autoComplete="new-password"
              required
              minLength={6}
            />
            {confirmacao && senha !== confirmacao && (
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
            disabled={salvando || !pronta}
            className="w-full bg-espresso text-parchment py-3 font-body text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {salvando ? "Salvando…" : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RedefinirSenhaPage;
