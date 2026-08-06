/**
 * ler-documento
 *
 * Extrai dados de um documento (CPF, RG, CNH, comprovante bancário) para
 * pré-preencher o cadastro do recebedor.
 *
 * REGRA QUE NÃO PODE SER QUEBRADA: o arquivo NÃO é armazenado. Chega em
 * memória, é enviado ao modelo, e some quando a requisição termina.
 * Documento de identidade é dado sensível pela LGPD — guardar um arquivo
 * desses num projeto com repositório público seria assumir um risco sem
 * necessidade nenhuma, já que o destino final é o Pagar.me.
 *
 * O resultado é sempre uma SUGESTÃO: quem confirma é a pessoa.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Corpo {
  ping?: boolean;
  /** imagem em base64, sem o prefixo data: */
  imagem?: string;
  tipo_midia?: string;
}

const INSTRUCAO = `Você lê documentos brasileiros e devolve os dados encontrados.

Responda SOMENTE com JSON, sem texto ao redor e sem cercas de código:

{
  "nome": string | null,
  "documento": string | null,
  "nascimento": string | null,
  "banco": string | null,
  "agencia": string | null,
  "conta": string | null,
  "conta_digito": string | null,
  "confianca": "alta" | "media" | "baixa",
  "observacao": string | null
}

Regras:
- "documento": só os dígitos do CPF ou CNPJ.
- "nascimento": AAAA-MM-DD.
- Campo que você não conseguir ler com clareza: null. NUNCA chute.
- Se a imagem estiver ilegível, tremida ou cortada, devolva tudo null,
  confianca "baixa" e explique em "observacao" o que atrapalhou.
- Não invente dígito, letra ou data para completar um campo parcial.`;

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const chave = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  const corpo: Corpo = await req.json().catch(() => ({}));

  if (corpo.ping) return json({ disponivel: !!chave });
  if (!chave) return json({ erro: "Leitura de documento não configurada." }, 501);

  if (!req.headers.get("Authorization")) {
    return json({ erro: "É preciso estar autenticado." }, 401);
  }
  if (!corpo.imagem) return json({ erro: "Nenhuma imagem recebida." }, 400);

  // ~8 MB em base64
  if (corpo.imagem.length > 11_000_000) {
    return json({ erro: "A imagem é grande demais. Tente uma foto menor." }, 413);
  }

  const usaLovable = !!Deno.env.get("LOVABLE_API_KEY");
  const url = usaLovable
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const modelo = usaLovable ? "google/gemini-2.5-flash" : "gpt-4o-mini";
  const tipo = corpo.tipo_midia ?? "image/jpeg";

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: INSTRUCAO },
          {
            role: "user",
            content: [
              { type: "text", text: "Leia este documento." },
              {
                type: "image_url",
                image_url: { url: `data:${tipo};base64,${corpo.imagem}` },
              },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0,
      }),
    });

    if (resposta.status === 429) {
      return json({ erro: "Muitas leituras agora. Tente em instantes." }, 429);
    }

    if (!resposta.ok) {
      console.error("Leitura falhou:", resposta.status);
      return json({ erro: "Não conseguimos ler o documento agora." }, 502);
    }

    const dados = await resposta.json();
    const bruto: string = dados?.choices?.[0]?.message?.content ?? "";
    const limpo = bruto.replace(/```json|```/g, "").trim();

    let extraido: Record<string, unknown>;
    try {
      extraido = JSON.parse(limpo);
    } catch {
      return json(
        { erro: "Não conseguimos entender o documento. Preencha à mão." },
        422,
      );
    }

    return json({
      sugestao: extraido,
      aviso: "Confira cada campo antes de salvar — a leitura pode errar.",
    });
  } catch (erro) {
    console.error("Falha ao ler documento:", erro);
    return json({ erro: "Não conseguimos ler o documento agora." }, 502);
  }
  // A imagem sai de escopo aqui e nada dela é persistido.
});
