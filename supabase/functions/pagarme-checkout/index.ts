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
//
// Split de pagamento: se o artesão de um item já tem pagarme_recipient_id
// (criado via a função criar-recebedor + stone-split-service), a fatia
// dele (order_items.artisan_amount_cents, já calculada por criar_pedido
// com a NOSSA comissão — platform_settings.default_commission_bps, não
// o modelo Hotmart do stone-split-service) vai direto pro recipient dele
// no split nativo do Pagar.me. O resto (comissão da plataforma + itens
// de artesão ainda sem recipient configurado) fica implícito na conta
// principal, dona da secret key — normal quando o split não cobre 100%.
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
    .select("*, order_items(title, quantity, total_cents, artisan_id, artisan_amount_cents)")
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
  type ItemPedido = { title: string; quantity: number; total_cents: number; artisan_id: string; artisan_amount_cents: number };
  const itens: ItemPedido[] = order.order_items ?? [];

  // Split nativo do Pagar.me: um recipient por artesão que já tem
  // pagarme_recipient_id, com a fatia que criar_pedido já calculou pra
  // ele (artisan_amount_cents, na NOSSA comissão). Artesão sem
  // recipient ainda: a fatia dele fica implícita na conta principal até
  // ele terminar o cadastro de recebimento.
  const somaPorArtesao = new Map<string, number>();
  for (const it of itens) {
    somaPorArtesao.set(it.artisan_id, (somaPorArtesao.get(it.artisan_id) ?? 0) + it.artisan_amount_cents);
  }
  const artisanIds = [...somaPorArtesao.keys()];
  const { data: recebedores } = artisanIds.length
    ? await admin.from("artisan_billing").select("artisan_id, pagarme_recipient_id").in("artisan_id", artisanIds)
    : { data: [] as { artisan_id: string; pagarme_recipient_id: string | null }[] };
  const recipientPorArtesao = new Map(
    (recebedores ?? []).filter((r) => r.pagarme_recipient_id).map((r) => [r.artisan_id, r.pagarme_recipient_id as string]),
  );
  const split = artisanIds
    .filter((id) => recipientPorArtesao.has(id))
    .map((id) => ({
      recipient_id: recipientPorArtesao.get(id),
      amount: somaPorArtesao.get(id)!,
      type: "flat" as const,
      options: { charge_processing_fee: false, liable: false, charge_remainder_fee: false },
    }));

  const payload: Record<string, unknown> = {
    code: order.number?.toString(),
    items: itens.map((it) => ({
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
    payload.payments = [{ payment_method: "pix", pix: { expires_in: 3600 }, ...(split.length ? { split } : {}) }];
  } else if (order.payment_method === "boleto") {
    payload.payments = [
      {
        payment_method: "boleto",
        boleto: { instructions: "Pagável em qualquer banco até o vencimento.", due_at: new Date(Date.now() + 3 * 86400_000).toISOString() },
        ...(split.length ? { split } : {}),
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
        ...(split.length ? { split } : {}),
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
