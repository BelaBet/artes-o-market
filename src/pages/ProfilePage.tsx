import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMeuPerfil, useSalvarPerfil } from "@/hooks/useMeuPerfil";
import { usePageMeta } from "@/hooks/usePageMeta";

const campo =
  "w-full border border-border bg-transparent px-3 py-2.5 font-body text-[0.82rem] outline-none focus:border-terra transition-colors";
const rotulo = "block text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-2";

const ProfilePage = () => {
  usePageMeta("Meu Perfil");
  const { user } = useAuth();
  const { perfil, loading } = useMeuPerfil();
  const { salvar, salvando, erro } = useSalvarPerfil();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  useEffect(() => {
    if (!perfil) return;
    setNome(perfil.display_name ?? "");
    setCidade(perfil.city ?? "");
    setUf(perfil.state ?? "");
  }, [perfil]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user]);

  const salvarPerfil = async () => {
    if (!nome.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    const emailMudou = email.trim() !== (user?.email ?? "");
    const ok = await salvar({ displayName: nome.trim(), city: cidade.trim(), state: uf.trim().toUpperCase() }, email.trim());
    if (ok) {
      toast.success(
        emailMudou
          ? "Perfil salvo! Confirme o novo e-mail na caixa de entrada dele para concluir a troca."
          : "Perfil atualizado!",
      );
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-[0.82rem] text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 md:px-9 py-10 sm:py-14">
      <h1 className="font-display text-[1.8rem] sm:text-[2.2rem] font-light mb-1">Meu Perfil</h1>
      <p className="text-[0.82rem] text-muted-foreground mb-8">Veja e edite as informações do seu cadastro.</p>

      <div className="space-y-4">
        <div>
          <label className={rotulo}>Nome completo</label>
          <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <label className={rotulo}>E-mail</label>
          <input type="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="text-[0.68rem] text-muted-foreground mt-1.5">
            Se você trocar o e-mail, enviaremos uma confirmação pro endereço novo antes de valer.
          </p>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-4">
          <div>
            <label className={rotulo}>Cidade</label>
            <input className={campo} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label className={rotulo}>Estado</label>
            <input
              className={`${campo} uppercase`}
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              placeholder="UF"
            />
          </div>
        </div>

        {erro && <p className="text-[0.76rem] text-destructive">{erro}</p>}

        <button
          onClick={salvarPerfil}
          disabled={salvando}
          className="bg-espresso text-parchment px-6 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all disabled:opacity-50 flex items-center gap-2 mt-2"
        >
          {salvando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Salvar perfil
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
