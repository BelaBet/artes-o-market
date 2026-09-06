// Edge Function: pagarme-webhook
//
// Recebe as notificações assíncronas do Pagar.me (pagamento confirmado,
// falhou, foi cancelado/estornado) e atualiza o pedido correspondente.
// A baixa de estoque e liberação/devolução de vaga em experiências
// acontece sozinha via trigger `orders_baixa_estoque` no banco quando
// o status muda — esta função só decide QUAL status gravar.
//
// Configuração necessária:
//   PAGARME_WEBHOOK_SECRET — mesmo valor configurado como senha do
//     Basic Auth na URL do webhook cadastrada no painel do Pagar.me
//     (https://dashboard.pagar.me > Webhooks). Sem isso, qualquer um
//     que descobrisse esta URL poderia forjar "pagamento aprovado".
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já disponíveis por padrão
import { createClient } from "npm:@supabase/supabase-js@2";

const EVENTO_PARA_STATUS: Record<string, string> = {
  "order.paid": "paid",
  "order.payment_failed": "canceled",
  "order.canceled": "canceled",
  "charge.paid": "paid",
  "charge.payment_failed": "canceled",
  "charge.refunded": "refunded",
  "charge.chargedback": "refunded",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405 });
  }

  const webhookSecret = Deno.env.get("PAGARME_WEBHOOK_SECRET");
  if (!webhookSecret) {
    // Sem segredo configurado, não dá pra distinguir o Pagar.me de
    // qualquer um que ache esta URL — recusa em vez de aceitar sem checar.
    return new Response(JSON.stringify({ error: "PAGARME_WEBHOOK_SECRET não configurado" }), { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  const esperado = `Basic ${btoa(`webhook:${webhookSecret}`)}`;
  if (auth !== esperado) {
    return new Response(JSON.stringify({ error: "não autorizado" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase não configurado" }), { status: 500 });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  let evento: { id: string; type: string; data?: { id?: string; order?: { id?: string } } };
  try {
    evento = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400 });
  }

  const { data: jaProcessado } = await admin
    .from("pagarme_events")
    .select("id")
    .eq("event_id", evento.id)
    .maybeSingle();
  if (jaProcessado) {
    return new Response(JSON.stringify({ ok: true, duplicate: true }), { status: 200 });
  }

  const pagarmeOrderId = evento.data?.order?.id ?? evento.data?.id;
  // Duas buscas por igualdade em vez de um .or() com string interpolada:
  // o id pode vir de qualquer jeito no payload, e um .or() montado por
  // concatenação aceitaria vírgulas/parênteses do atacante como sintaxe
  // de filtro (ver revisão de segurança).
  let order: { id: string; status: string } | null = null;
  if (pagarmeOrderId) {
    const porOrderId = await admin.from("orders").select("id, status").eq("pagarme_order_id", pagarmeOrderId).maybeSingle();
    order = porOrderId.data ?? null;
    if (!order) {
      const porChargeId = await admin.from("orders").select("id, status").eq("pagarme_charge_id", pagarmeOrderId).maybeSingle();
      order = porChargeId.data ?? null;
    }
  }

  const novoStatus = EVENTO_PARA_STATUS[evento.type];
  let erro: string | null = null;

  if (!order) {
    erro = `Pedido não encontrado para ${pagarmeOrderId ?? "?"}`;
  } else if (novoStatus && novoStatus !== order.status) {
    const { error } = await admin.from("orders").update({ status: novoStatus }).eq("id", order.id);
    if (error) erro = error.message;
  }

  await admin.from("pagarme_events").insert({
    event_id: evento.id,
    event_type: evento.type,
    order_id: order?.id ?? null,
    payload: evento,
    processed_at: erro ? null : new Date().toISOString(),
    error: erro,
  });

  return new Response(JSON.stringify({ ok: !erro }), {
    status: erro ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
});
