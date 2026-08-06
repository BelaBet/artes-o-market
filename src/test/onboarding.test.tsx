import { describe, expect, it } from "vitest";
import {
  BLOCOS,
  ETAPAS_ONBOARDING,
  FORMAS_DE_TRABALHAR,
  etapaParaRetomar,
  etapaRespondida,
  etapasRespondidas,
} from "@/lib/painel/blocos";

describe("Onboarding do artesão", () => {
  it("tem no máximo 4 etapas", () => {
    expect(ETAPAS_ONBOARDING).toHaveLength(4);
  });

  it("pede só o essencial na entrada", () => {
    // Fotos, contatos e dados comerciais saíram da experiência inicial —
    // se voltarem para cá, o onboarding volta a ficar longo.
    const ids = ETAPAS_ONBOARDING.map((e) => e.id);
    expect(ids).toEqual(["sobre", "trabalho", "vender", "historia"]);
    expect(ids).not.toContain("fotos");
    expect(ids).not.toContain("contatos");
    expect(ids).not.toContain("capacidade");
  });

  it("todas as etapas do onboarding continuam editáveis em Minha Loja", () => {
    const blocos = BLOCOS.map((b) => b.id);
    for (const etapa of ETAPAS_ONBOARDING) {
      expect(blocos, `bloco ausente para "${etapa.id}"`).toContain(etapa.id);
    }
  });

  it("os blocos cobrem tudo o que saiu da entrada", () => {
    const blocos = BLOCOS.map((b) => b.id);
    for (const esperado of ["fotos", "contatos", "encomendas", "aulas", "empresas", "adicionais"]) {
      expect(blocos).toContain(esperado);
    }
  });

  it("as formas de trabalhar incluem a saída para quem não decidiu", () => {
    expect(FORMAS_DE_TRABALHAR.map((f) => f.tipo)).toContain("undecided");
  });
});

describe("Retomar o onboarding de onde parou", () => {
  const progresso = (feitos: string[]) =>
    ["nome", "cidade", "materiais", "tecnicas", "vendas", "historia"].map((etapa) => ({
      etapa,
      concluida: feitos.includes(etapa),
    }));

  it("começa em Sobre quando nada foi respondido", () => {
    expect(etapaParaRetomar(null, progresso([]))).toBe("sobre");
  });

  it("volta exatamente para a etapa em que a pessoa parou", () => {
    // Parou em "vender" com Sobre e Trabalho já respondidos.
    expect(etapaParaRetomar("vender", progresso(["nome", "cidade", "materiais"]))).toBe(
      "vender",
    );
  });

  it("pula a etapa salva se ela já foi respondida por outro caminho", () => {
    // Parou em "trabalho", mas preencheu materiais pelos blocos de Minha
    // Loja. Voltar para "trabalho" seria repetir pergunta.
    expect(
      etapaParaRetomar("trabalho", progresso(["nome", "cidade", "materiais"])),
    ).toBe("vender");
  });

  it("ignora etapa salva inválida", () => {
    expect(etapaParaRetomar("etapa-que-nao-existe", progresso(["nome", "cidade"]))).toBe(
      "trabalho",
    );
  });

  it("Sobre só conta como respondida com nome e cidade", () => {
    expect(etapaRespondida("sobre", progresso(["nome"]))).toBe(false);
    expect(etapaRespondida("sobre", progresso(["nome", "cidade"]))).toBe(true);
  });

  it("Trabalho aceita material OU técnica", () => {
    expect(etapaRespondida("trabalho", progresso(["tecnicas"]))).toBe(true);
  });

  it("conta quantas etapas já foram respondidas", () => {
    expect(etapasRespondidas(progresso(["nome", "cidade", "materiais"]))).toBe(2);
    expect(etapasRespondidas(progresso([]))).toBe(0);
  });

  it("com tudo respondido, aponta para a última etapa em vez de quebrar", () => {
    const tudo = progresso(["nome", "cidade", "materiais", "tecnicas", "vendas", "historia"]);
    expect(etapaParaRetomar(null, tudo)).toBe("sobre");
    expect(etapasRespondidas(tudo)).toBe(4);
  });
});
