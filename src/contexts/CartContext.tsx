import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { ProdutoCard } from "@/hooks/useProdutos";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";

export interface CartItem {
  id: string;
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
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  totalItems: number;
  totalPrice: number;
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
        { id: produto.id, name: produto.name, artist: produto.artist, price: produto.price, priceCents: produto.priceCents, img: produto.img, qty: 1 },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === productId ? { ...i, qty } : i)));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, removeItem, updateQty, totalItems, totalPrice, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
