import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { PRODUCTS } from "@/lib/data";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";

export interface CartItem {
  id: number;
  name: string;
  artist: string;
  price: number;
  img: string;
  qty: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: number) => void;
  removeItem: (productId: number) => void;
  updateQty: (productId: number, qty: number) => void;
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

  const addItem = (productId: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === productId);
      if (existing) {
        return prev.map((i) => (i.id === productId ? { ...i, qty: i.qty + 1 } : i));
      }
      const product = PRODUCTS.find((p) => p.id === productId);
      if (!product) return prev;
      return [...prev, { id: product.id, name: product.name, artist: product.artist, price: product.price, img: product.img, qty: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const updateQty = (productId: number, qty: number) => {
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
