/**
 * Cliente do Pagar.me v5, compartilhado pelas edge functions.
 *
 * A chave vive só aqui, no servidor. Nunca no front — que é público.
 */

const BASE = "https://api.pagar.me/core/v5";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function chavePagarme(): string | null {
  return Deno.env.get("PAGARME_SECRET_KEY") ?? null;
}

/** A API v5 usa Basic com a chave secreta como usuário e senha vazia. */
function autorizacao(chave: string): string {
  return `Basic ${btoa(`${chave}:`)}`;
}

export interface RespostaPagarme<T> {
  ok: boolean;
  status: number;
  dados: T | null;
  erro: string | null;
}

export async function chamarPagarme<T = unknown>(
  caminho: string,
  opcoes: { metodo?: string; corpo?: unknown; idempotencia?: string } = {},
): Promise<RespostaPagarme<T>> {
  const chave = chavePagarme();
  if (!chave) {
    return { ok: false, status: 501, dados: null, erro: "PAGARME_SECRET_KEY não configurada" };
  }

  const cabecalhos: Record<string, string> = {
    Authorization: autorizacao(chave),
    "Content-Type": "application/json",
  };

  // Evita cobrar duas vezes quando a rede falha no meio e o cliente
  // repete a chamada.
  if (opcoes.idempotencia) cabecalhos["Idempotency-Key"] = opcoes.idempotencia;

  const resposta = await fetch(`${BASE}${caminho}`, {
    method: opcoes.metodo ?? "GET",
    headers: cabecalhos,
    body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
  });

  const texto = await resposta.text();
  let dados: T | null = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!resposta.ok) {
    // Nunca devolvemos o corpo bruto do provedor ao navegador: pode
    // conter dado de terceiro. Fica no log.
    console.error("Pagar.me", resposta.status, caminho, texto);
    return {
      ok: false,
      status: resposta.status,
      dados,
      erro: mensagemAmigavel(resposta.status),
    };
  }

  return { ok: true, status: resposta.status, dados, erro: null };
}

function mensagemAmigavel(status: number): string {
  if (status === 401 || status === 403) return "Configuração de pagamento inválida.";
  if (status === 422) return "Alguns dados do pagamento não foram aceitos.";
  if (status === 429) return "Muitas tentativas agora. Aguarde um instante.";
  return "Não conseguimos falar com o meio de pagamento agora.";
}

export function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Só dígitos — o Pagar.me recusa CPF e CEP formatados. */
export function digitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}
