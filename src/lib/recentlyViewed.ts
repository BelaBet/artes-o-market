import { VISUALIZADOS_STORAGE_KEY } from "@/lib/storageKeys";

const LIMITE = 20;

/** Chama ao abrir a página de um produto — mais recente primeiro, sem repetir. */
export function registrarVisualizacao(produtoId: string) {
  try {
    const atuais = lerVisualizados().filter((id) => id !== produtoId);
    const novos = [produtoId, ...atuais].slice(0, LIMITE);
    localStorage.setItem(VISUALIZADOS_STORAGE_KEY, JSON.stringify(novos));
  } catch {
    // localStorage indisponível — não é crítico, só não registra.
  }
}

export function lerVisualizados(): string[] {
  try {
    const bruto = localStorage.getItem(VISUALIZADOS_STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
