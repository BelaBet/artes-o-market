import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProductGrid from "@/components/ProductGrid";
import { CartProvider } from "@/contexts/CartContext";
import { PRODUCTS } from "@/lib/data";

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

  it("mostra os produtos quando o carregamento termina", () => {
    renderizar(<ProductGrid products={PRODUCTS.slice(0, 3)} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(PRODUCTS[0].name)).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há resultados", () => {
    renderizar(<ProductGrid products={[]} />);
    expect(screen.getByText(/nenhuma peça por aqui/i)).toBeInTheDocument();
  });

  it("carrega as imagens da primeira dobra com prioridade e o resto em lazy", () => {
    renderizar(<ProductGrid products={PRODUCTS.slice(0, 6)} />);
    const imagens = screen.getAllByRole("img");
    expect(imagens[0]).toHaveAttribute("fetchpriority", "high");
    expect(imagens[5]).toHaveAttribute("loading", "lazy");
  });
});
