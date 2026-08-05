import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";
import type { Peca } from "@/lib/catalogo";

export interface CartItem {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistSlug: string;
  priceCents: number;
  imageUrl: string | null;
  tint: string | null;
  qty: number;
  /** limite de unidades disponíveis no momento em que foi adicionado */
  maxQty: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (peca: Peca) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  totalItems: number;
  totalCents: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function carregarCarrinho(): CartItem[] {
  try {
    const bruto = localStorage.getItem(CARRINHO_STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Carrinho persistido: o PWA pode recarregar sozinho ao atualizar.
  const [items, setItems] = useState<CartItem[]>(carregarCarrinho);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage indisponível (modo privado, cota cheia) — segue em memória.
    }
  }, [items]);

  const addItem = (peca: Peca) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.id === peca.id);

      if (existente) {
        // Peça única não vai a 2; estoque contado respeita o disponível.
        if (existente.qty >= existente.maxQty) return prev;
        return prev.map((i) =>
          i.id === peca.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }

      return [
        ...prev,
        {
          id: peca.id,
          slug: peca.slug,
          title: peca.title,
          artistName: peca.artisan.shopName,
          artistSlug: peca.artisan.slug,
          priceCents: peca.priceCents,
          imageUrl: peca.imageUrl,
          tint: peca.tint,
          qty: 1,
          maxQty: peca.stockMode === "unique" ? 1 : Math.max(peca.stockQuantity, 1),
        },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQty = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, i.maxQty) } : i)),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((soma, i) => soma + i.qty, 0);
  const totalCents = items.reduce((soma, i) => soma + i.priceCents * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, isOpen, setIsOpen, addItem, removeItem, updateQty, totalItems, totalCents, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
