import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { PRODUCTS } from "@/lib/data";
import { CARRINHO_STORAGE_KEY } from "@/lib/storageKeys";
import type { Peca } from "@/lib/catalogo";

export interface CartItem {
  // number = peça do catálogo local; string (UUID) = peça vinda do banco.
  // As duas convivem enquanto a vitrine não migra por completo.
  id: number | string;
  name: string;
  artist: string;
  price: number;
  img: string;
  qty: number;
  /** URL já resolvida, para peças do banco */
  imageUrl?: string | null;
  tint?: string | null;
  /** limite de unidades, quando conhecido */
  maxQty?: number;
}

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (productId: number) => void;
  /** adiciona uma peça vinda do banco (página de produto) */
  addPeca: (peca: Peca) => void;
  removeItem: (productId: number | string) => void;
  updateQty: (productId: number | string, qty: number) => void;
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

  const addPeca = (peca: Peca) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.id === peca.id);
      const limite = peca.stockMode === "unique" ? 1 : Math.max(peca.stockQuantity, 1);

      if (existente) {
        if (existente.qty >= (existente.maxQty ?? limite)) return prev;
        return prev.map((i) => (i.id === peca.id ? { ...i, qty: i.qty + 1 } : i));
      }

      return [
        ...prev,
        {
          id: peca.id,
          name: peca.title,
          artist: peca.artisan.shopName,
          price: peca.priceCents / 100,
          img: "",
          imageUrl: peca.imageUrl,
          tint: peca.tint,
          qty: 1,
          maxQty: limite,
        },
      ];
    });
    setIsOpen(true);
  };

  const removeItem = (productId: number | string) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const updateQty = (productId: number | string, qty: number) => {
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
    <CartContext.Provider value={{ items, isOpen, setIsOpen, addItem, addPeca, removeItem, updateQty, totalItems, totalPrice, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
