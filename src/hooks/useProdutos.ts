import { useEffect, useState } from "react";
import { PRODUCTS } from "@/lib/data";

type Produto = (typeof PRODUCTS)[number];

/**
 * Ponto de troca para o Supabase.
 *
 * Hoje os produtos vêm de `src/lib/data.ts` (síncrono), então `loading`
 * só é verdadeiro no primeiro frame. Quando a consulta virar rede, basta
 * substituir o corpo deste hook por um `useQuery` — a grade já sabe
 * exibir o esqueleto sozinha.
 */
export function useProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setProdutos(PRODUCTS);
    setLoading(false);
  }, []);

  return { produtos, loading };
}
