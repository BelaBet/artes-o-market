import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjetosSobMedidaPage from "@/pages/ProjetosSobMedidaPage";
import { FAIXAS_ORCAMENTO, FAIXAS_QUANTIDADE, ROTULO_STATUS, TIPOS } from "@/hooks/useEncomendas";

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("Projetos Sob Medida", () => {
  it("a página de entrada convida a criar um projeto", () => {
    render(
      <MemoryRouter>
        <ProjetosSobMedidaPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /criar projeto sob medida/i }),
    ).toHaveAttribute("href", "/projetos-sob-medida/criar");
  });

  it("os tipos de pedido cobrem pessoa física e empresa", () => {
    const tipos = TIPOS.map((t) => t.tipo);
    expect(tipos).toContain("personalizar");
    expect(tipos).toContain("brindes");
    expect(tipos).toContain("arquitetura");
  });

  it("as faixas de valor incluem a opção de não informar", () => {
    const semValor = FAIXAS_ORCAMENTO.find((f) => f.min === null && f.max === null);
    expect(semValor?.rotulo).toMatch(/proposta/i);
  });

  it("as faixas de quantidade permitem não saber ainda", () => {
    const naoSei = FAIXAS_QUANTIDADE.find((f) => f.min === null);
    expect(naoSei?.rotulo).toMatch(/não sei/i);
  });

  it("todo status do banco tem rótulo em português", () => {
    // Se um status novo entrar no enum sem rótulo, a tela mostraria o
    // valor cru do banco para o comprador.
    const statusDoBanco = [
      "rascunho", "enviada", "em_distribuicao", "recebendo_propostas",
      "em_negociacao", "proposta_escolhida", "aguardando_pagamento",
      "confirmada", "em_producao", "pronta_para_envio", "enviada_ao_cliente",
      "entregue", "concluida", "cancelada", "expirada",
    ];
    for (const s of statusDoBanco) {
      expect(ROTULO_STATUS[s], `sem rótulo para "${s}"`).toBeTruthy();
    }
  });
});
