import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { FAVORITOS_STORAGE_KEY } from "@/lib/storageKeys";

interface FavoritesContextType {
  favoritos: string[];
  isFavorito: (id: string) => boolean;
  alternarFavorito: (id: string) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

function carregarFavoritos(): string[] {
  try {
    const bruto = localStorage.getItem(FAVORITOS_STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Favoritos (coração no card do produto) — guardados no navegador, iguais
 * pra quem está logado ou não, igual o carrinho.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoritos, setFavoritos] = useState<string[]>(carregarFavoritos);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITOS_STORAGE_KEY, JSON.stringify(favoritos));
    } catch {
      // localStorage indisponível (modo privado, cota cheia) — segue em memória.
    }
  }, [favoritos]);

  const isFavorito = (id: string) => favoritos.includes(id);

  const alternarFavorito = (id: string) => {
    setFavoritos((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <FavoritesContext.Provider value={{ favoritos, isFavorito, alternarFavorito }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
