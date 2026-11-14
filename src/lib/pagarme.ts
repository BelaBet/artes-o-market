// Tokenização de cartão direto no navegador, com a chave PÚBLICA do
// Pagar.me (nunca a secreta) — o número, nome, validade e CVV do cartão
// nunca passam pelo nosso backend, só o token resultante (ver comentário
// em supabase/functions/pagarme-checkout/index.ts).
const PAGARME_PUBLIC_KEY = import.meta.env.VITE_PAGARME_PUBLIC_KEY as string | undefined;

export interface DadosCartao {
  numero: string;
  nomeTitular: string;
  validade: string; // "MM/AA" ou "MM/AAAA"
  cvv: string;
}

export async function tokenizarCartao(cartao: DadosCartao): Promise<string> {
  if (!PAGARME_PUBLIC_KEY) {
    throw new Error("Pagamento por cartão ainda não está configurado neste site.");
  }

  const [mesTexto, anoTexto] = cartao.validade.split("/").map((p) => p.trim());
  const mes = Number(mesTexto);
  const ano = anoTexto?.length === 2 ? 2000 + Number(anoTexto) : Number(anoTexto);
  if (!mes || !ano) {
    throw new Error("Validade do cartão inválida. Use o formato MM/AA.");
  }

  const resposta = await fetch(`https://api.pagar.me/core/v5/tokens?appId=${PAGARME_PUBLIC_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "card",
      card: {
        number: cartao.numero.replace(/\D/g, ""),
        holder_name: cartao.nomeTitular,
        exp_month: mes,
        exp_year: ano,
        cvv: cartao.cvv.replace(/\D/g, ""),
      },
    }),
  });

  const dados = await resposta.json();
  if (!resposta.ok || !dados.id) {
    throw new Error(dados?.message ?? "Não foi possível validar os dados do cartão.");
  }
  return dados.id as string;
}
