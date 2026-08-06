/**
 * criar-pagamento
 *
 * Recebe um order_id e cria o pedido no Pagar.me com split.
 *
 * Regra que sustenta tudo: valores vêm do banco, nunca do navegador. O
 * cliente manda apenas o id do pedido e, no cartão, o token do cartão.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, chamarPagarme, digitos, json } from "../_shared/pagarme.ts";

interface Corpo {
  order_id?: string;
  card_token?: string;
  ping?: boolean;
}

interface ItemPedido {
  id: string;
  title: string;
  quantity: number;
  total_cents: number;
  platform_fee_cents: number;
  artisan_amount_cents: number;
  artisan_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const corpo: Corpo = await req.json().catch(() => ({}));
  if (corpo.ping) {
    return json({ disponivel: !!Deno.env.get("PAGARME_SECRET_KEY") });
  }

  const autorizacao = req.headers.get("Authorization");
  if (!autorizacao) return json({ erro: "É preciso estar autenticado." }, 401);
  if (!corpo.order_id) return json({ erro: "Pedido não informado." }, 400);

  // Cliente com o token de quem chamou: a RLS continua valendo, então
  // ninguém paga o pedido de outra pessoa.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: autorizacao } } },
  );

  const { data: pedido, error: erroPedido } = await supabase
    .from("orders")
    .select("*")
    .eq("id", corpo.order_id)
    .maybeSingle();

  if (erroPedido || !pedido) return json({ erro: "Pedido não encontrado." }, 404);
  if (pedido.status !== "pending") return json({ erro: "Este pedido já foi processado." }, 409);
  if (!pedido.payment_method) return json({ erro: "Escolha a forma de pagamento." }, 400);

  const { data: itens } = await supabase
    .from("order_items")
    .select("id, title, quantity, total_cents, platform_fee_cents, artisan_amount_cents, artisan_id")
    .eq("order_id", pedido.id);

  if (!itens?.length) return json({ erro: "Pedido sem itens." }, 400);

  // ---------------------------------------------------------------
  // Split
  //
  // Cada artesão recebe a soma dos itens dele. A plataforma recebe a
  // comissão + o frete + a taxa de serviço, e responde pelos custos:
  // gateway e antifraude não podem ser divididos por regra de split.
  // ---------------------------------------------------------------
  const servico = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const porArtesao = new Map<string, number>();
  let comissaoTotal = 0;

  for (const item of itens as ItemPedido[]) {
    porArtesao.set(
      item.artisan_id,
      (porArtesao.get(item.artisan_id) ?? 0) + item.artisan_amount_cents,
    );
    comissaoTotal += item.platform_fee_cents;
  }

  const { data: recebedores } = await servico
    .from("artisan_billing")
    .select("artisan_id, pagarme_recipient_id")
    .in("artisan_id", [...porArtesao.keys()]);

  const semRecebedor = [...porArtesao.keys()].filter(
    (id) => !recebedores?.find((r) => r.artisan_id === id)?.pagarme_recipient_id,
  );

  if (semRecebedor.length) {
    // Vender sem recebedor cadastrado deixaria o dinheiro preso na
    // plataforma sem caminho até o artesão.
    return json(
      { erro: "Uma das peças ainda não está pronta para venda. Tente novamente mais tarde." },
      409,
    );
  }

  const recebedorPlataforma = Deno.env.get("PAGARME_PLATFORM_RECIPIENT_ID");
  if (!recebedorPlataforma) {
    return json({ erro: "Configuração de pagamento incompleta." }, 501);
  }

  const valorPlataforma =
    comissaoTotal + pedido.shipping_cents + pedido.service_fee_cents;

  const split = [
    {
      amount: valorPlataforma,
      recipient_id: recebedorPlataforma,
      type: "flat",
      options: {
        liable: true,
        charge_processing_fee: true,
        charge_remainder_fee: true,
      },
    },
    ...[...porArtesao.entries()].map(([artisanId, valor]) => ({
      amount: valor,
      recipient_id: recebedores!.find((r) => r.artisan_id === artisanId)!.pagarme_recipient_id!,
      type: "flat",
      options: {
        liable: false,
        charge_processing_fee: false,
        charge_remainder_fee: false,
      },
    })),
  ];

  const somaSplit = split.reduce((s, r) => s + r.amount, 0);
  if (somaSplit !== pedido.total_cents) {
    // Falha aqui é preferível a criar cobrança que não fecha.
    console.error("Split não fecha", { somaSplit, total: pedido.total_cents });
    return json({ erro: "Não conseguimos calcular o pagamento. Tente de novo." }, 500);
  }

  const metodo = pedido.payment_method as "pix" | "credit_card" | "boleto";

  const pagamento: Record<string, unknown> = { payment_method: metodo, split };

  if (metodo === "pix") {
    pagamento.pix = { expires_in: 3600 };
  } else if (metodo === "boleto") {
    pagamento.boleto = { instructions: "Pagar até o vencimento", due_at: emDias(3) };
  } else {
    if (!corpo.card_token) return json({ erro: "Dados do cartão não recebidos." }, 400);
    pagamento.credit_card = {
      installments: pedido.installments ?? 1,
      statement_descriptor: "FEITOAMAO",
      card_token: corpo.card_token,
    };
  }

  const { ok, dados, erro } = await chamarPagarme<Record<string, any>>("/orders", {
    metodo: "POST",
    // Mesmo pedido nunca vira duas cobranças.
    idempotencia: `pedido-${pedido.id}`,
    corpo: {
      code: String(pedido.number),
      customer: {
        name: pedido.buyer_name,
        email: pedido.buyer_email,
        type: "individual",
        document: digitos(pedido.buyer_document),
        phones: pedido.buyer_phone
          ? {
              mobile_phone: {
                country_code: "55",
                area_code: digitos(pedido.buyer_phone).slice(0, 2),
                number: digitos(pedido.buyer_phone).slice(2),
              },
            }
          : undefined,
      },
      items: (itens as ItemPedido[]).map((i) => ({
        amount: Math.round(i.total_cents / i.quantity),
        description: i.title.slice(0, 60),
        quantity: i.quantity,
      })),
      payments: [pagamento],
    },
  });

  if (!ok || !dados) {
    await servico
      .from("orders")
      .update({ payment_error: erro })
      .eq("id", pedido.id);
    return json({ erro }, 502);
  }

  const cobranca = dados.charges?.[0];
  const transacao = cobranca?.last_transaction ?? {};

  await servico
    .from("orders")
    .update({
      pagarme_order_id: dados.id,
      pagarme_charge_id: cobranca?.id ?? null,
      pix_qr_code: transacao.qr_code ?? null,
      pix_expires_at: transacao.expires_at ?? null,
      boleto_url: transacao.pdf ?? transacao.url ?? null,
      boleto_line: transacao.line ?? null,
      payment_error: null,
    })
    .eq("id", pedido.id);

  return json({
    order_id: pedido.id,
    status: cobranca?.status ?? dados.status,
    pix_qr_code: transacao.qr_code ?? null,
    pix_qr_code_url: transacao.qr_code_url ?? null,
    boleto_url: transacao.pdf ?? transacao.url ?? null,
    boleto_line: transacao.line ?? null,
  });
});

function emDias(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString();
}
