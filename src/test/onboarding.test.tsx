import { describe, expect, it } from "vitest";
import { BLOCOS, ETAPAS_ONBOARDING, FORMAS_DE_TRABALHAR } from "@/lib/painel/blocos";

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
