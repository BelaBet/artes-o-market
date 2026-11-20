import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type MeuPerfil = Tables<"profiles">;

/** Perfil da pessoa logada (comprador ou artesão) — criado automaticamente no cadastro. */
export function useMeuPerfil() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["meu-perfil", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MeuPerfil | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 15_000,
  });

  return { perfil: query.data ?? null, loading: query.isLoading };
}

export interface DadosPerfil {
  displayName: string;
  city: string;
  state: string;
}

/**
 * Salva o perfil e, se o nome mudou, atualiza também o metadata de auth
 * (de onde o checkout pré-preenche o nome). E-mail muda separado: pede
 * confirmação no endereço novo, então avisamos em vez de assumir sucesso.
 */
export function useSalvarPerfil() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const salvar = async (dados: DadosPerfil, novoEmail?: string): Promise<boolean> => {
    if (!user) return false;
    setSalvando(true);
    setErro(null);
    try {
      const { error: erroPerfil } = await supabase
        .from("profiles")
        .update({ display_name: dados.displayName, city: dados.city, state: dados.state })
        .eq("user_id", user.id);
      if (erroPerfil) throw erroPerfil;

      const atualizacoesAuth: { data?: { display_name: string }; email?: string } = {
        data: { display_name: dados.displayName },
      };
      if (novoEmail && novoEmail !== user.email) {
        atualizacoesAuth.email = novoEmail;
      }
      const { error: erroAuth } = await supabase.auth.updateUser(atualizacoesAuth);
      if (erroAuth) throw erroAuth;

      queryClient.invalidateQueries({ queryKey: ["meu-perfil", user.id] });
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o perfil agora.");
      return false;
    } finally {
      setSalvando(false);
    }
  };

  return { salvar, salvando, erro };
}
