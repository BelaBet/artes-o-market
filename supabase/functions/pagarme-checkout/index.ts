// Edge Function: pagarme-checkout
//
// Cria a cobrança no Pagar.me para um pedido que já existe no banco
// (criado via RPC `criar_pedido` + `definir_pagamento`, chamados pelo
// front-end) e grava de volta os dados de pagamento (QR code do Pix,
// linha digitável do boleto, ou o resultado da cobrança no cartão).
//
// Requer os secrets, configurados via `supabase secrets set`:
//   PAGARME_SECRET_KEY   — chave secreta da conta Pagar.me (sk_...)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já disponíveis por padrão
//
// Nunca recebe dados de cartão brutos: o front-end tokeniza o cartão
// direto com o Pagar.me (chave pública) e manda só o `card_token` aqui.
import { createClient } from "npm:@supabase/supabase-js@2";

const PAGARME_API = "https://api.pagar.me/core/v5";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface Corpo {
  order_id: string;
  card_token?: string;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pagarmeSecretKey = Deno.env.get("PAGARME_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase não configurado" }), { status: 500, headers });
  }
  if (!pagarmeSecretKey) {
    return new Response(
      JSON.stringify({ error: "PAGARME_SECRET_KEY não configurada. Rode: supabase secrets set PAGARME_SECRET_KEY=sk_..." }),
      { status: 500, headers },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers });
  }

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers });
  }
  if (!corpo.order_id) {
    return new Response(JSON.stringify({ error: "order_id é obrigatório" }), { status: 400, headers });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*, order_items(title, quantity, total_cents)")
    .eq("id", corpo.order_id)
    .maybeSingle();
  if (orderError || !order) {
    return new Response(JSON.stringify({ error: "Pedido não encontrado" }), { status: 404, headers });
  }
  if (order.buyer_user_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: "Este pedido não pertence a você" }), { status: 403, headers });
  }
  if (order.status !== "pending") {
    return new Response(JSON.stringify({ error: "Este pedido já foi processado" }), { status: 409, headers });
  }
  if (!order.payment_method) {
    return new Response(JSON.stringify({ error: "Escolha uma forma de pagamento antes de continuar" }), { status: 400, headers });
  }

  const documento = (order.buyer_document ?? "").replace(/\D/g, "");
  const telefone = (order.buyer_phone ?? "").replace(/\D/g, "");
  const payload: Record<string, unknown> = {
    code: order.number?.toString(),
    items: (order.order_items ?? []).map((it: { title: string; quantity: number; total_cents: number }) => ({
      amount: it.total_cents,
      description: it.title.slice(0, 255),
      quantity: it.quantity,
    })),
    customer: {
      name: order.buyer_name,
      email: order.buyer_email,
      type: documento.length > 11 ? "company" : "individual",
      document: documento || undefined,
      phones: telefone
        ? { mobile_phone: { country_code: "55", area_code: telefone.slice(0, 2), number: telefone.slice(2) } }
        : undefined,
    },
  };

  if (order.payment_method === "pix") {
    payload.payments = [{ payment_method: "pix", pix: { expires_in: 3600 } }];
  } else if (order.payment_method === "boleto") {
    payload.payments = [
      {
        payment_method: "boleto",
        boleto: { instructions: "Pagável em qualquer banco até o vencimento.", due_at: new Date(Date.now() + 3 * 86400_000).toISOString() },
      },
    ];
  } else if (order.payment_method === "credit_card") {
    if (!corpo.card_token) {
      return new Response(JSON.stringify({ error: "card_token é obrigatório para cartão de crédito" }), { status: 400, headers });
    }
    payload.payments = [
      {
        payment_method: "credit_card",
        credit_card: { installments: order.installments ?? 1, card_token: corpo.card_token },
      },
    ];
  }

  const resposta = await fetch(`${PAGARME_API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${pagarmeSecretKey}:`)}`,
    },
    body: JSON.stringify(payload),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    const mensagem = resultado?.message ?? "Falha ao processar o pagamento";
    await admin.from("orders").update({ payment_error: mensagem }).eq("id", order.id);
    return new Response(JSON.stringify({ error: mensagem }), { status: 502, headers });
  }

  const charge = resultado.charges?.[0];
  const atualizacao: Record<string, unknown> = {
    pagarme_order_id: resultado.id,
    pagarme_charge_id: charge?.id ?? null,
    payment_error: null,
  };

  if (order.payment_method === "pix") {
    const transacaoPix = charge?.last_transaction;
    atualizacao.pix_qr_code = transacaoPix?.qr_code ?? null;
    atualizacao.pix_expires_at = transacaoPix?.expires_at ?? null;
  } else if (order.payment_method === "boleto") {
    const transacaoBoleto = charge?.last_transaction;
    atualizacao.boleto_url = transacaoBoleto?.pdf ?? transacaoBoleto?.url ?? null;
    atualizacao.boleto_line = transacaoBoleto?.line ?? null;
  } else if (order.payment_method === "credit_card" && charge?.status === "paid") {
    atualizacao.status = "paid";
  }

  await admin.from("orders").update(atualizacao).eq("id", order.id);

  return new Response(JSON.stringify({ order_id: order.id, pagarme_order_id: resultado.id, charge }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
