import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { ProdutoCard } from "@/hooks/useProdutos";
import type { ExperienciaCard } from "@/hooks/useExperiencias";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";

export type CartItemKind = "product" | "experience";

export interface CartItem {
  id: string;
  kind: CartItemKind;
  name: string;
  artist: string;
  price: number;
  priceCents: number;
  img: string | null;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (produto: ProdutoCard) => void;
  addExperience: (experiencia: ExperienciaCard) => void;
  removeItem: (itemId: string) => void;
  updateQty: (itemId: string, qty: number) => void;
  totalItems: number;
  totalPrice: number;
  /** true se o carrinho só tem experiências — não faz sentido pedir endereço de entrega. */
  requerEndereco: boolean;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function carregarCarrinho(): CartItem[] {
  try {
    const bruto = localStorage.getItem(CARRINHO_STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    // Carrinhos salvos antes da distinção produto/experiência não tinham `kind`.
    return dados.map((i) => ({ kind: "product" as const, ...i }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Carrinho persistido: como o PWA pode recarregar sozinho ao atualizar,
  // manter só em memória descartaria a compra em andamento.
  const [items, setItems] = useState<CartItem[]>(carregarCarrinho);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CARRINHO_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // localStorage indisponível (modo privado, cota cheia) — segue em memória.
    }
  }, [items]);

  const addItem = (produto: ProdutoCard) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === produto.id);
      if (existing) {
        return prev.map((i) => (i.id === produto.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        { id: produto.id, kind: "product", name: produto.name, artist: produto.artist, price: produto.price, priceCents: produto.priceCents, img: produto.img, qty: 1 },
      ];
    });
    setIsOpen(true);
  };

  const addExperience = (experiencia: ExperienciaCard) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === experiencia.id);
      if (existing) {
        return prev.map((i) => (i.id === experiencia.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        { id: experiencia.id, kind: "experience", name: experiencia.title, artist: experiencia.creator, price: experiencia.price, priceCents: experiencia.priceCents, img: experiencia.img, qty: 1 },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, qty } : i)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const requerEndereco = items.some((i) => i.kind === "product");

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, addExperience, removeItem, updateQty, totalItems, totalPrice, requerEndereco, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
