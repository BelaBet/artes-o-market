// Edge Function: criar-recebedor
//
// Cria o recebedor (recipient) do artesão no Pagar.me/Stone via o
// stone-split-service, e grava o pagarme_recipient_id em
// artisan_billing. Depois disso, pedidos dessa loja podem usar split
// de verdade em pagarme-checkout (o dinheiro cai direto na conta do
// artesão, sem passar pela conta da plataforma).
//
// Nunca é chamado direto pelo navegador do artesão com a chave do
// stone-split-service — essa chave (SPLIT_SERVICE_API_KEY) só existe
// aqui, no backend.
//
// Requer os secrets, configurados via `supabase secrets set`:
//   SPLIT_SERVICE_URL      — URL pública do stone-split-service (Railway)
//   SPLIT_SERVICE_API_KEY  — mesmo valor de SERVICE_API_KEY lá
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — já disponíveis por padrão
import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

interface Corpo {
  type: "individual" | "company";
  name: string;
  document: string;
  email: string;
  bankAccount: {
    bank: string;
    branchNumber: string;
    accountNumber: string;
    accountCheckDigit: string;
    accountType: "checking" | "savings";
  };
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const splitServiceUrl = Deno.env.get("SPLIT_SERVICE_URL");
  const splitServiceApiKey = Deno.env.get("SPLIT_SERVICE_API_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase não configurado" }), { status: 500, headers });
  }
  if (!splitServiceUrl || !splitServiceApiKey) {
    return new Response(
      JSON.stringify({ error: "SPLIT_SERVICE_URL/SPLIT_SERVICE_API_KEY não configurados. Rode: supabase secrets set SPLIT_SERVICE_URL=... SPLIT_SERVICE_API_KEY=..." }),
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

  const { data: artisan, error: artisanError } = await admin
    .from("artisans")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (artisanError || !artisan) {
    return new Response(JSON.stringify({ error: "Você ainda não tem uma loja" }), { status: 404, headers });
  }

  let corpo: Corpo;
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers });
  }
  if (!corpo.name || !corpo.document || !corpo.email || !corpo.bankAccount) {
    return new Response(JSON.stringify({ error: "Preencha nome, documento, e-mail e dados bancários" }), { status: 400, headers });
  }

  const resposta = await fetch(`${splitServiceUrl.replace(/\/$/, "")}/recipients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": splitServiceApiKey },
    body: JSON.stringify({ ...corpo, externalCode: artisan.id, role: "produtor" }),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    return new Response(JSON.stringify({ error: resultado?.error ?? "Falha ao criar recebedor" }), { status: 502, headers });
  }

  const { error: erroSalvar } = await admin.from("artisan_billing").upsert(
    {
      artisan_id: artisan.id,
      pagarme_recipient_id: resultado.id,
      recipient_status: resultado.status ?? "pending",
      kyc_status: resultado.kyc_state ?? null,
    },
    { onConflict: "artisan_id" },
  );
  if (erroSalvar) {
    return new Response(JSON.stringify({ error: `Recebedor criado (${resultado.id}), mas falhou ao salvar: ${erroSalvar.message}` }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ recipientId: resultado.id, status: resultado.status ?? "pending" }), {
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
