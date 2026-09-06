export interface Nota {
  media: number;
  total: number;
}

/** Agrupa notas (1-5) por chave (product_id, experience_id, ...) e tira a média de cada grupo. */
export function agregarNotas<K extends string>(
  linhas: { chave: K | null; rating: number }[],
): Map<K, Nota> {
  const somas = new Map<K, { soma: number; total: number }>();
  for (const { chave, rating } of linhas) {
    if (!chave) continue;
    const atual = somas.get(chave) ?? { soma: 0, total: 0 };
    atual.soma += rating;
    atual.total += 1;
    somas.set(chave, atual);
  }
  const resultado = new Map<K, Nota>();
  for (const [chave, { soma, total }] of somas) {
    resultado.set(chave, { media: total ? soma / total : 0, total });
  }
  return resultado;
}
