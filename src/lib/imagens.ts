import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve um `storage_path` salvo no banco para uma URL utilizável em
 * `<img src>`.
 *
 * Duas origens convivem hoje:
 *  - fotos reais enviadas por artesãos: caminho relativo dentro do bucket
 *    "lojas" (ex.: "<artisan_id>/produtos/foo.jpg");
 *  - conteúdo de demonstração: caminho absoluto servido pelo próprio site
 *    (ex.: "/demo/stone.jpg") ou uma URL completa (http/https).
 */
export function resolverImagem(caminho: string | null | undefined): string | null {
  if (!caminho) return null;
  if (/^https?:\/\//.test(caminho) || caminho.startsWith("/")) return caminho;
  return supabase.storage.from("lojas").getPublicUrl(caminho).data.publicUrl;
}
