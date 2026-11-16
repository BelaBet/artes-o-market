// Roda o corretor ortográfico (nspell + dicionário Hunspell pt-BR,
// ~5MB) numa thread separada. Montar esse dicionário é um processamento
// pesado e síncrono — dentro do worker, isso nunca trava a tela principal
// (digitação, cliques, scroll) enquanto acontece.
import nspell from "nspell";

type Corretor = ReturnType<typeof nspell>;

let corretorPromise: Promise<Corretor> | null = null;

function carregarCorretor(): Promise<Corretor> {
  if (!corretorPromise) {
    corretorPromise = Promise.all([
      fetch("/dict/pt-BR.aff").then((r) => r.text()),
      fetch("/dict/pt-BR.dic").then((r) => r.text()),
    ]).then(([aff, dic]) => nspell({ aff, dic }));
  }
  return corretorPromise;
}

export interface PedidoVerificacao {
  id: number;
  palavra: string;
}

export interface RespostaVerificacao {
  id: number;
  correta: boolean;
  sugestao: string | null;
}

self.onmessage = async (evento: MessageEvent<PedidoVerificacao>) => {
  const { id, palavra } = evento.data;
  try {
    const corretor = await carregarCorretor();
    const correta = corretor.correct(palavra);
    const sugestao = correta ? null : (corretor.suggest(palavra)[0] ?? null);
    const resposta: RespostaVerificacao = { id, correta, sugestao };
    self.postMessage(resposta);
  } catch {
    // Dicionário não carregou (sem internet, etc.) — devolve "correta"
    // pra não travar a correção, só deixa de sugerir nada.
    const resposta: RespostaVerificacao = { id, correta: true, sugestao: null };
    self.postMessage(resposta);
  }
};
