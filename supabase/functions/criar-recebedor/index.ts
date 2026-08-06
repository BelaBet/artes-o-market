/**
 * criar-recebedor
 *
 * Cadastra o artesão como recebedor no Pagar.me.
 *
 * Decisão de privacidade: CPF, conta bancária e endereço passam por aqui
 * e vão para o Pagar.me — não são gravados no nosso banco. Guardamos só
 * o recipient_id e o andamento. Este repositório é público, e quem tem
 * obrigação regulatória de guardar esses dados é o provedor.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, chamarPagarme, digitos, json } from "../_shared/pagarme.ts";

interface Corpo {
  ping?: boolean;
  nome?: string;
  email?: string;
  documento?: string;       // CPF ou CNPJ
  nascimento?: string;      // AAAA-MM-DD
  telefone?: string;
  faturamento_mensal?: number;
  ocupacao?: string;
  endereco?: {
    rua?: string; numero?: string; complemento?: string;
    bairro?: string; cidade?: string; estado?: string; cep?: string;
  };
  banco?: {
    codigo?: string; agencia?: string; conta?: string;
    conta_digito?: string; tipo?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const corpo: Corpo = await req.json().catch(() => ({}));
  if (corpo.ping) return json({ disponivel: !!Deno.env.get("PAGARME_SECRET_KEY") });

  const autorizacao = req.headers.get("Authorization");
  if (!autorizacao) return json({ erro: "É preciso estar autenticado." }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: autorizacao } } },
  );

  // A RLS garante que isto devolve a loja de quem chamou, e só ela.
  const { data: loja } = await supabase
    .from("artisans")
    .select("id, shop_name")
    .maybeSingle();

  if (!loja) return json({ erro: "Loja não encontrada." }, 404);

  const doc = digitos(corpo.documento);
  if (doc.length !== 11 && doc.length !== 14) {
    return json({ erro: "Informe um CPF ou CNPJ válido." }, 400);
  }
  if (!corpo.banco?.codigo || !corpo.banco.agencia || !corpo.banco.conta) {
    return json({ erro: "Faltam os dados da conta bancária." }, 400);
  }

  const pessoaFisica = doc.length === 11;
  const telefone = digitos(corpo.telefone);

  const { ok, dados, erro } = await chamarPagarme<Record<string, unknown>>("/recipients", {
    metodo: "POST",
    // Reenvio por falha de rede não cria dois recebedores para a loja.
    idempotencia: `recebedor-${loja.id}`,
    corpo: {
      name: corpo.nome,
      email: corpo.email,
      description: loja.shop_name,
      document: doc,
      type: pessoaFisica ? "individual" : "corporation",
      default_bank_account: {
        holder_name: corpo.nome,
        holder_type: pessoaFisica ? "individual" : "company",
        holder_document: doc,
        bank: corpo.banco.codigo,
        branch_number: digitos(corpo.banco.agencia),
        account_number: digitos(corpo.banco.conta),
        account_check_digit: corpo.banco.conta_digito ?? "",
        type: corpo.banco.tipo ?? "checking",
      },
      register_information: {
        email: corpo.email,
        document: doc,
        type: pessoaFisica ? "individual" : "corporation",
        name: corpo.nome,
        ...(pessoaFisica
          ? {
              birthdate: corpo.nascimento,
              monthly_income: corpo.faturamento_mensal ?? 100000,
              professional_occupation: corpo.ocupacao ?? "Artesão",
            }
          : {
              company_name: corpo.nome,
              trading_name: loja.shop_name,
              annual_revenue: corpo.faturamento_mensal ?? 1200000,
            }),
        phone_numbers: telefone
          ? [{ ddd: telefone.slice(0, 2), number: telefone.slice(2), type: "mobile" }]
          : [],
        address: {
          street: corpo.endereco?.rua,
          street_number: corpo.endereco?.numero,
          complementary: corpo.endereco?.complemento ?? "",
          neighborhood: corpo.endereco?.bairro,
          city: corpo.endereco?.cidade,
          state: corpo.endereco?.estado,
          zip_code: digitos(corpo.endereco?.cep),
          reference_point: "",
        },
      },
    },
  });

  if (!ok || !dados) return json({ erro }, 502);

  const registro = dados as { id?: string; status?: string; kyc_details?: { status?: string } };

  // Só o id e o andamento ficam conosco.
  const servico = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  await servico.from("artisan_billing").upsert({
    artisan_id: loja.id,
    pagarme_recipient_id: registro.id,
    recipient_status: registro.status ?? null,
    kyc_status: registro.kyc_details?.status ?? null,
  });

  return json({
    recipient_id: registro.id,
    status: registro.status,
    aviso:
      "Você já pode vender. Para receber o dinheiro na conta, será preciso concluir a verificação de identidade quando o link for liberado.",
  });
});
