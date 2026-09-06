import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolverImagem } from "@/lib/imagens";
import { agregarNotas } from "@/lib/avaliacoes";

export interface ExperienciaCard {
  id: string;
  featured: boolean;
  kind: "live" | "recorded" | "in_person" | "mentorship";
  title: string;
  description: string | null;
  creator: string;
  location: string | null;
  durationMinutes: number | null;
  price: number;
  rating: number;
  reviews: number;
  img: string | null;
}

export function useExperiencias() {
  const query = useQuery({
    queryKey: ["experiencias"],
    queryFn: async (): Promise<ExperienciaCard[]> => {
      const { data, error } = await supabase
        .from("experiences")
        .select(`
          id, featured, kind, title, description, price_cents, duration_minutes, location, cover_path, cover_tint,
          artisans(shop_name, public_name)
        `)
        .in("status", ["active", "sold_out"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      const linhas = data ?? [];

      const ids = linhas.map((e) => e.id);
      const { data: avaliacoes } = ids.length
        ? await supabase.from("reviews").select("experience_id, rating").in("experience_id", ids)
        : { data: [] as { experience_id: string | null; rating: number }[] };
      const notas = agregarNotas((avaliacoes ?? []).map((r) => ({ chave: r.experience_id, rating: r.rating })));

      return linhas.map((e): ExperienciaCard => {
        const nota = notas.get(e.id);
        return {
          id: e.id,
          featured: e.featured,
          kind: e.kind,
          title: e.title,
          description: e.description,
          creator: e.artisans?.public_name || e.artisans?.shop_name || "Artesão",
          location: e.location,
          durationMinutes: e.duration_minutes,
          price: e.price_cents / 100,
          rating: nota?.media ?? 0,
          reviews: nota?.total ?? 0,
          img: resolverImagem(e.cover_path),
        };
      });
    },
    staleTime: 30_000,
  });

  return { experiencias: query.data ?? [], loading: query.isLoading };
}
