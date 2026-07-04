import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Typed wrapper around beta supabase.auth.oauth namespace.
type OAuthResult = {
  data: {
    client?: { name?: string; client_uri?: string; logo_uri?: string };
    scopes?: string[];
    redirect_url?: string;
    redirect_to?: string;
  } | null;
  error: { message: string } | null;
};
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

const OAuthConsent = () => {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className="max-w-[420px] text-center">
          <div className="font-display text-[1.4rem] mb-2">Não foi possível carregar</div>
          <p className="text-[0.84rem] text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="text-[0.84rem] text-muted-foreground">Carregando…</div>
      </main>
    );
  }
  const clientName = details.client?.name ?? "Um aplicativo";
  return (
    <main className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[460px] bg-background border border-border p-8">
        <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-3">Autorização</div>
        <h1 className="font-display text-[1.6rem] leading-tight mb-3">
          Conectar <em className="italic text-terra">{clientName}</em> à sua conta
        </h1>
        <p className="text-[0.84rem] text-muted-foreground mb-6 font-light">
          Isso permitirá que {clientName} acesse os dados da sua loja no Feito à Mão em seu nome,
          usando as ferramentas disponíveis (perfil e avaliações).
        </p>
        {details.scopes && details.scopes.length > 0 && (
          <ul className="text-[0.76rem] text-foreground/80 mb-6 space-y-1">
            {details.scopes.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 bg-espresso text-parchment border-none py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 bg-transparent text-foreground border border-border py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:bg-foreground hover:text-background transition-all disabled:opacity-50"
          >
            Negar
          </button>
        </div>
      </div>
    </main>
  );
};

export default OAuthConsent;
