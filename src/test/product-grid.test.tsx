import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductGrid from "@/components/ProductGrid";
import { CartProvider } from "@/contexts/CartContext";
import type { ProdutoCard } from "@/hooks/useProdutos";

const renderizar = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <CartProvider>{ui}</CartProvider>
    </MemoryRouter>,
  );

function produto(overrides: Partial<ProdutoCard> = {}): ProdutoCard {
  return {
    id: crypto.randomUUID(),
    slug: "produto-teste",
    name: "Produto de Teste",
    artist: "Artesã de Teste",
    artisanSlug: "artesa-de-teste",
    city: "Teste, TS",
    price: 100,
    priceCents: 10000,
    img: null,
    badge: null,
    stars: 0,
    reviews: 0,
    categorySlug: null,
    stockQuantity: 5,
    ...overrides,
  };
}

const PRODUTOS = Array.from({ length: 6 }, (_, i) => produto({ name: `Produto ${i + 1}` }));

describe("ProductGrid", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    renderizar(<ProductGrid products={[]} loading skeletonCount={6} />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText(/carregando peças/i)).toBeInTheDocument();
  });

  it("mostra os produtos quando o carregamento termina", () => {
    renderizar(<ProductGrid products={PRODUTOS.slice(0, 3)} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(PRODUTOS[0].name)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há resultados", () => {
    renderizar(<ProductGrid products={[]} />);
    expect(screen.getByText(/nenhuma peça por aqui/i)).toBeInTheDocument();
  });

  it("carrega as imagens da primeira dobra com prioridade e o resto em lazy", () => {
    renderizar(<ProductGrid products={PRODUTOS.map((p) => produto({ ...p, img: "/demo/stone.jpg" }))} />);
    const imagens = screen.getAllByRole("img");
    expect(imagens[0]).toHaveAttribute("fetchpriority", "high");
    expect(imagens[5]).toHaveAttribute("loading", "lazy");
  });
});
