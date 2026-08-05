import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductGrid from "@/components/ProductGrid";
import { CartProvider } from "@/contexts/CartContext";
import type { Peca } from "@/lib/catalogo";

const peca = (i: number, extra: Partial<Peca> = {}): Peca => ({
  id: `peca-${i}`,
  slug: `peca-${i}`,
  title: `Peça ${i}`,
  description: null,
  priceCents: 12900,
  compareAtCents: null,
  categorySlug: "ceramica",
  imageUrl: `/img/${i}.jpg`,
  tint: "#8C6744",
  badge: null,
  stockMode: "quantity",
  stockQuantity: 5,
  artisan: {
    id: "loja-1",
    slug: "ana-lima",
    shopName: "Ateliê Ana Lima",
    city: "Ouro Preto",
    state: "MG",
  },
  ...extra,
});

const pecas = (n: number) => Array.from({ length: n }, (_, i) => peca(i));

const renderizar = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <CartProvider>{ui}</CartProvider>
    </MemoryRouter>,
  );

describe("ProductGrid", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    renderizar(<ProductGrid loading skeletonCount={6} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/carregando peças/i)).toBeInTheDocument();
  });

  it("mostra as peças quando o carregamento termina", () => {
    renderizar(<ProductGrid products={pecas(3)} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Peça 0")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há resultados", () => {
    renderizar(<ProductGrid products={[]} />);
    expect(screen.getByText(/nenhuma peça por aqui/i)).toBeInTheDocument();
  });

  it("carrega as imagens da primeira dobra com prioridade e o resto em lazy", () => {
    renderizar(<ProductGrid products={pecas(6)} />);
    const imagens = screen.getAllByRole("img");
    expect(imagens[0]).toHaveAttribute("fetchpriority", "high");
    expect(imagens[5]).toHaveAttribute("loading", "lazy");
  });

  it("formata preço em reais a partir dos centavos", () => {
    renderizar(<ProductGrid products={[peca(1, { priceCents: 8500 })]} />);
    expect(screen.getByText(/R\$\s?85,00/)).toBeInTheDocument();
  });

  it("marca peça única e desabilita o botão quando esgotada", () => {
    renderizar(
      <ProductGrid products={[peca(1, { stockMode: "unique", stockQuantity: 0 })]} />,
    );
    expect(screen.getByRole("button", { name: /vendida/i })).toBeDisabled();
  });

  it("liga o nome do ateliê ao perfil do artesão", () => {
    renderizar(<ProductGrid products={[peca(1)]} />);
    expect(screen.getByRole("link", { name: /ateliê ana lima/i })).toHaveAttribute(
      "href",
      "/artesao/ana-lima",
    );
  });
});
