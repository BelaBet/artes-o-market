import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Loja = Tables<"artisans">;

/**
 * Garante que a pessoa logada tenha uma loja.
 *
 * Chamada no primeiro acesso ao painel: se ainda não existe, a função no
 * banco cria com um slug derivado do nome — o artesão não precisa saber
 * o que é um slug.
 */
export function useMinhaLoja() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["minha-loja", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Loja | null> => {
      const { data: existente } = await supabase
        .from("artisans")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existente) return existente;

      const nome =
        (user!.user_metadata?.display_name as string | undefined) ?? "Meu Ateliê";

      const { data, error } = await supabase.rpc("garantir_minha_loja", {
        _shop_name: nome,
      });
      if (error) throw error;
      return (data as unknown as Loja) ?? null;
    },
    staleTime: 30_000,
  });

  return {
    loja: query.data ?? null,
    loading: query.isLoading,
    erro: query.error as Error | null,
  };
}

/**
 * Cria a loja sob demanda (ex.: clique em "Abrir Minha Loja").
 *
 * Se já existir, apenas devolve a existente. Idempotente: a função no banco
 * usa o usuário logado e não duplica lojas.
 */
export function useAbrirMinhaLoja() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [criando, setCriando] = useState(false);

  const abrirLoja = useCallback(async (): Promise<Loja | null> => {
    if (!user) return null;
    setCriando(true);
    try {
      const { data: existente } = await supabase
        .from("artisans")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existente) {
        queryClient.setQueryData(["minha-loja", user.id], existente);
        return existente;
      }

      const nome =
        (user.user_metadata?.display_name as string | undefined) ?? "Meu Ateliê";

      const { data, error } = await supabase.rpc("garantir_minha_loja", {
        _shop_name: nome,
      });
      if (error) throw error;

      const nova = (data as unknown as Loja) ?? null;
      if (nova) queryClient.setQueryData(["minha-loja", user.id], nova);
      queryClient.invalidateQueries({ queryKey: ["minha-loja", user.id] });
      return nova;
    } finally {
      setCriando(false);
    }
  }, [user, queryClient]);

  return { abrirLoja, criando };
}

export type EtapaProgresso = { etapa: string; rotulo: string; concluida: boolean };

export function useProgresso(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["progresso", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<EtapaProgresso[]> => {
      const { data, error } = await supabase.rpc("progresso_da_loja", {
        _artisan_id: artisanId!,
      });
      if (error) throw error;
      return (data as unknown as EtapaProgresso[]) ?? [];
    },
    staleTime: 15_000,
  });

  const etapas = query.data ?? [];
  const concluidas = etapas.filter((e) => e.concluida).length;

  return {
    etapas,
    concluidas,
    total: etapas.length,
    percentual: etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0,
    loading: query.isLoading,
  };
}

export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

/**
 * Salvamento automático com atraso.
 *
 * O artesão não deve procurar botão "salvar" no meio do onboarding — mas
 * também não dá para gravar a cada tecla. 900 ms depois da última
 * alteração é o ponto em que a pessoa já parou de digitar.
 */
export function useSalvarLoja(artisanId: string | undefined) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const pendentes = useRef<Partial<Loja>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gravar = useCallback(async () => {
    if (!artisanId) return;
    const dados = pendentes.current;
    pendentes.current = {};
    if (Object.keys(dados).length === 0) return;

    setEstado("salvando");
    const { error } = await supabase.from("artisans").update(dados).eq("id", artisanId);

    if (error) {
      // Devolve para a fila: a resposta da pessoa não pode sumir.
      pendentes.current = { ...dados, ...pendentes.current };
      setEstado("erro");
      return;
    }

    setEstado("salvo");
    queryClient.invalidateQueries({ queryKey: ["minha-loja"] });
    queryClient.invalidateQueries({ queryKey: ["progresso", artisanId] });
  }, [artisanId, queryClient]);

  const salvar = useCallback(
    (campos: Partial<Loja>) => {
      pendentes.current = { ...pendentes.current, ...campos };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(gravar, 900);
    },
    [gravar],
  );

  const salvarAgora = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    return gravar();
  }, [gravar]);

  // Não perder o que estava na fila ao sair da tela.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void gravar();
    };
  }, [gravar]);

  return { salvar, salvarAgora, estado, tentarNovamente: salvarAgora };
}

// ---------------------------------------------------------------------
// Vocabulários (materiais, técnicas, estilos) e seleções da loja
// ---------------------------------------------------------------------
type TabelaVocabulario = "materials" | "techniques" | "styles";
type TabelaLigacao = "artisan_materials" | "artisan_techniques" | "artisan_styles";

const LIGACAO: Record<TabelaVocabulario, { tabela: TabelaLigacao; coluna: string }> = {
  materials: { tabela: "artisan_materials", coluna: "material_id" },
  techniques: { tabela: "artisan_techniques", coluna: "technique_id" },
  styles: { tabela: "artisan_styles", coluna: "style_id" },
};

export function useVocabulario(tabela: TabelaVocabulario) {
  const query = useQuery({
    queryKey: ["vocabulario", tabela],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select("id, slug, name")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30 * 60_000,
  });

  return { opcoes: query.data ?? [], loading: query.isLoading };
}

export function useSelecaoVocabulario(
  tabela: TabelaVocabulario,
  artisanId: string | undefined,
) {
  const { tabela: ligacao, coluna } = LIGACAO[tabela];
  const queryClient = useQueryClient();
  const chave = ["selecao", tabela, artisanId];

  const query = useQuery({
    queryKey: chave,
    enabled: !!artisanId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from(ligacao)
        .select(coluna)
        .eq("artisan_id", artisanId!);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, string>[]).map((r) => r[coluna]);
    },
    staleTime: 15_000,
  });

  const alternar = async (id: string, selecionado: boolean) => {
    if (!artisanId) return;

    const anterior = queryClient.getQueryData<string[]>(chave) ?? [];
    // Resposta imediata na tela; o banco recebe em seguida.
    queryClient.setQueryData<string[]>(
      chave,
      selecionado ? [...anterior, id] : anterior.filter((x) => x !== id),
    );

    try {
      if (selecionado) {
        await supabase.from(ligacao).insert({ artisan_id: artisanId, [coluna]: id } as never);
      } else {
        await (supabase.from(ligacao).delete() as any)
          .eq("artisan_id", artisanId)
          .eq(coluna, id);
      }
    } catch {
      queryClient.setQueryData<string[]>(chave, anterior);
      return;
    }

    queryClient.invalidateQueries({ queryKey: chave });
    queryClient.invalidateQueries({ queryKey: ["progresso", artisanId] });
  };


  return { selecionados: query.data ?? [], alternar, loading: query.isLoading };
}

// ---------------------------------------------------------------------
// O que a loja oferece
// ---------------------------------------------------------------------
export type TipoOferta =
  | "product" | "custom_order" | "class" | "workshop" | "course"
  | "studio_visit" | "cultural_experience" | "lecture" | "event"
  | "corporate" | "stores" | "hotels" | "architects" | "corporate_gifts"
  | "school" | "undecided";

export function useOfertas(artisanId: string | undefined) {
  const queryClient = useQueryClient();
  const chave = ["ofertas", artisanId];

  const query = useQuery({
    queryKey: chave,
    enabled: !!artisanId,
    queryFn: async (): Promise<TipoOferta[]> => {
      const { data, error } = await supabase
        .from("artisan_offerings")
        .select("offering_type")
        .eq("artisan_id", artisanId!);
      if (error) throw error;
      return (data ?? []).map((r) => r.offering_type as TipoOferta);
    },
    staleTime: 15_000,
  });

  const alternar = async (tipo: TipoOferta, selecionado: boolean) => {
    if (!artisanId) return;

    if (selecionado) {
      await supabase
        .from("artisan_offerings")
        .insert({ artisan_id: artisanId, offering_type: tipo });
    } else {
      await supabase
        .from("artisan_offerings")
        .delete()
        .eq("artisan_id", artisanId)
        .eq("offering_type", tipo);
    }

    queryClient.invalidateQueries({ queryKey: chave });
    queryClient.invalidateQueries({ queryKey: ["progresso", artisanId] });
  };

  return { ofertas: query.data ?? [], alternar, loading: query.isLoading };
}
