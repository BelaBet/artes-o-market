/**
 * webhook-pagarme
 *
 * Recebe as notificações do Pagar.me e move o pedido de estado. Quem
 * baixa estoque é o trigger do banco, disparado quando o status vira
 * 'paid' — aqui só mudamos o status.
 *
 * Duas proteções obrigatórias:
 *  1. assinatura: sem conferir, qualquer um marca pedido como pago
 *     mandando um POST para esta URL
 *  2. idempotência: o Pagar.me repete a notificação em falha de rede, e
 *     processar duas vezes baixaria estoque duas vezes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, json } from "../_shared/pagarme.ts";

const STATUS_POR_EVENTO: Record<string, string> = {
  "charge.paid": "paid",
  "order.paid": "paid",
  "charge.payment_failed": "pending",
  "charge.refunded": "refunded",
  "order.canceled": "canceled",
  "charge.canceled": "canceled",
};

/** Compara em tempo constante, para não vazar a assinatura por timing. */
function assinaturaConfere(esperada: string, recebida: string): boolean {
  if (esperada.length !== recebida.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) {
    diferenca |= esperada.charCodeAt(i) ^ recebida.charCodeAt(i);
  }
  return diferenca === 0;
}

async function hmacSha256(chave: string, mensagem: string): Promise<string> {
  const codificador = new TextEncoder();
  const chaveCripto = await crypto.subtle.importKey(
    "raw",
    codificador.encode(chave),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chaveCripto, codificador.encode(mensagem));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Método não suportado" }, 405);

  const bruto = await req.text();
  const segredo = Deno.env.get("PAGARME_WEBHOOK_SECRET");

  if (!segredo) {
    console.error("PAGARME_WEBHOOK_SECRET não configurado — webhook recusado");
    return json({ erro: "Webhook não configurado" }, 501);
  }

  const recebida =
    req.headers.get("x-hub-signature") ?? req.headers.get("X-Hub-Signature") ?? "";
  const esperada = `sha256=${await hmacSha256(segredo, bruto)}`;

  if (!assinaturaConfere(esperada, recebida)) {
    console.error("Assinatura inválida no webhook");
    return json({ erro: "Assinatura inválida" }, 401);
  }

  const evento = JSON.parse(bruto);
  const tipo: string = evento.type ?? "";
  const eventoId: string = evento.id ?? crypto.randomUUID();

  const servico = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // O UNIQUE em event_id é o que garante o processamento único: se já
  // existe, esta notificação é repetição.
  const { error: erroRegistro } = await servico.from("pagarme_events").insert({
    event_id: eventoId,
    event_type: tipo,
    payload: evento,
  });

  if (erroRegistro) {
    if (erroRegistro.code === "23505") {
      return json({ recebido: true, repetido: true });
    }
    console.error("Falha ao registrar evento:", erroRegistro);
    return json({ erro: "Falha ao registrar" }, 500);
  }

  const novoStatus = STATUS_POR_EVENTO[tipo];
  if (!novoStatus) {
    await servico
      .from("pagarme_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventoId);
    return json({ recebido: true, ignorado: tipo });
  }

  const pagarmeOrderId: string | undefined =
    evento.data?.order?.id ?? evento.data?.id ?? undefined;
  const codigo: string | undefined = evento.data?.order?.code ?? evento.data?.code;

  let consulta = servico.from("orders").select("id, status").limit(1);
  consulta = pagarmeOrderId
    ? consulta.eq("pagarme_order_id", pagarmeOrderId)
    : consulta.eq("number", Number(codigo));

  const { data: pedido } = await consulta.maybeSingle();

  if (!pedido) {
    await servico
      .from("pagarme_events")
      .update({ error: "pedido não encontrado", processed_at: new Date().toISOString() })
      .eq("event_id", eventoId);
    // 200 de propósito: repetir não vai encontrar o pedido também.
    return json({ recebido: true, aviso: "pedido não encontrado" });
  }

  // Não rebaixa um pedido já pago por causa de evento fora de ordem.
  const jaFinalizado = ["paid", "refunded", "canceled"].includes(pedido.status);
  if (jaFinalizado && novoStatus === "pending") {
    await servico
      .from("pagarme_events")
      .update({ order_id: pedido.id, processed_at: new Date().toISOString() })
      .eq("event_id", eventoId);
    return json({ recebido: true, ignorado: "evento fora de ordem" });
  }

  const { error: erroAtualizacao } = await servico
    .from("orders")
    .update({ status: novoStatus })
    .eq("id", pedido.id);

  await servico
    .from("pagarme_events")
    .update({
      order_id: pedido.id,
      processed_at: new Date().toISOString(),
      error: erroAtualizacao?.message ?? null,
    })
    .eq("event_id", eventoId);

  if (erroAtualizacao) {
    console.error("Falha ao atualizar pedido:", erroAtualizacao);
    return json({ erro: "Falha ao atualizar pedido" }, 500);
  }

  return json({ recebido: true, status: novoStatus });
});
