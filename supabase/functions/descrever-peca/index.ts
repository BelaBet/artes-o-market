/**
 * descrever-peca
 *
 * Redige uma descrição de peça a partir do que o artesão já informou.
 * Roda no servidor porque a chave do provedor não pode ficar no front.
 *
 * Configuração: defina LOVABLE_API_KEY (ou OPENAI_API_KEY) nos secrets do
 * projeto. Sem chave, a função responde { disponivel: false } e o painel
 * simplesmente não mostra o botão — em vez de oferecer algo que falha.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Corpo {
  ping?: boolean;
  titulo?: string;
  materiais?: string[];
  tecnicas?: string[];
  cidade?: string | null;
  estado?: string | null;
  dimensoes?: string;
  observacoes?: string;
}

const INSTRUCAO = `Você escreve descrições de peças para um marketplace de artesanato brasileiro.

Regras que não podem ser quebradas:
- Use SOMENTE os fatos fornecidos. Não invente material, técnica, medida,
  tempo de produção, origem cultural, tradição familiar, prêmio ou história.
- Se um dado não foi informado, simplesmente não fale dele.
- Não escreva na primeira pessoa do artesão: quem escreve é a loja.
- Português do Brasil, tom sóbrio e concreto, sem publicidade exagerada.
- Nada de "único", "exclusivo", "incomparável" como enfeite vazio.
- Entre 40 e 90 palavras, em um ou dois parágrafos curtos.
- Responda apenas com o texto da descrição, sem título e sem aspas.`;

function montarPedido(c: Corpo): string {
  const linhas = [`Peça: ${c.titulo}`];
  if (c.materiais?.length) linhas.push(`Materiais informados: ${c.materiais.join(", ")}`);
  if (c.tecnicas?.length) linhas.push(`Técnicas informadas: ${c.tecnicas.join(", ")}`);
  if (c.dimensoes) linhas.push(`Dimensões: ${c.dimensoes}`);
  if (c.cidade) linhas.push(`Feita em: ${[c.cidade, c.estado].filter(Boolean).join(", ")}`);
  if (c.observacoes) linhas.push(`Observações do artesão: ${c.observacoes}`);
  return linhas.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const chave = Deno.env.get("LOVABLE_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  const corpo: Corpo = await req.json().catch(() => ({}));

  // Sondagem do painel: existe chave configurada?
  if (corpo.ping) {
    return new Response(JSON.stringify({ disponivel: !!chave }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!chave) {
    return new Response(
      JSON.stringify({ erro: "Ajuda para escrever ainda não configurada." }),
      { status: 501, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  if (!corpo.titulo || corpo.titulo.trim().length < 2) {
    return new Response(
      JSON.stringify({ erro: "Informe o nome da peça primeiro." }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const usaLovable = !!Deno.env.get("LOVABLE_API_KEY");
  const url = usaLovable
    ? "https://ai.gateway.lovable.dev/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const modelo = usaLovable ? "google/gemini-2.5-flash" : "gpt-4o-mini";

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${chave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: INSTRUCAO },
          { role: "user", content: montarPedido(corpo) },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (resposta.status === 429) {
      return new Response(
        JSON.stringify({ erro: "Muitos pedidos agora. Tente de novo em instantes." }),
        { status: 429, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (!resposta.ok) {
      console.error("Provedor respondeu", resposta.status, await resposta.text());
      return new Response(
        JSON.stringify({ erro: "Não conseguimos escrever a sugestão agora." }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    const dados = await resposta.json();
    const descricao: string = dados?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!descricao) {
      return new Response(
        JSON.stringify({ erro: "A sugestão veio vazia. Tente de novo." }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ descricao }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error("Falha ao gerar descrição:", erro);
    return new Response(
      JSON.stringify({ erro: "Não conseguimos escrever a sugestão agora." }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
});
