import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type LojaAdmin = Tables<"artisans">;

/** Só quem tem o papel admin enxerga a área de recebedores. */
export function useEhAdmin() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["eh-admin", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) return false;
      return data === true;
    },
    staleTime: 5 * 60_000,
  });

  return { ehAdmin: query.data === true, verificando: query.isLoading };
}

export interface LojaComRecebimento extends LojaAdmin {
  artisan_billing: {
    pagarme_recipient_id: string | null;
    recipient_status: string | null;
    kyc_status: string | null;
    can_withdraw: boolean;
  } | null;
}

export function useLojasParaCadastro() {
  const query = useQuery({
    queryKey: ["admin-lojas"],
    queryFn: async (): Promise<LojaComRecebimento[]> => {
      const { data, error } = await supabase
        .from("artisans")
        .select(
          "*, artisan_billing ( pagarme_recipient_id, recipient_status, kyc_status, can_withdraw )",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LojaComRecebimento[];
    },
    staleTime: 30_000,
  });

  return { lojas: query.data ?? [], loading: query.isLoading };
}

export interface DadosRecebedor {
  nome: string;
  email: string;
  documento: string;
  nascimento: string;
  telefone: string;
  ocupacao: string;
  faturamento_mensal: number;
  endereco: {
    rua: string; numero: string; complemento: string;
    bairro: string; cidade: string; estado: string; cep: string;
  };
  banco: {
    codigo: string; agencia: string; conta: string;
    conta_digito: string; tipo: string;
  };
}

export function useCriarRecebedor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: DadosRecebedor & { artisan_id: string }) => {
      const { data, error } = await supabase.functions.invoke("criar-recebedor", {
        body: dados,
      });
      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);
      return data as { recipient_id: string; status: string; aviso: string };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-lojas"] }),
  });
}

export interface SugestaoDocumento {
  nome: string | null;
  documento: string | null;
  nascimento: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  conta_digito: string | null;
  confianca: "alta" | "media" | "baixa";
  observacao: string | null;
}

/**
 * Lê um documento para pré-preencher o formulário.
 *
 * O arquivo vai para a função e não é guardado em lugar nenhum — nem no
 * Storage, nem no banco.
 */
export function useLerDocumento() {
  return useMutation({
    mutationFn: async (arquivo: File): Promise<SugestaoDocumento> => {
      if (arquivo.size > 8 * 1024 * 1024) {
        throw new Error("A imagem passou de 8 MB. Tente uma foto menor.");
      }

      const base64 = await new Promise<string>((resolver, rejeitar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver(String(leitor.result).split(",")[1]);
        leitor.onerror = () => rejeitar(new Error("Não conseguimos abrir o arquivo."));
        leitor.readAsDataURL(arquivo);
      });

      const { data, error } = await supabase.functions.invoke("ler-documento", {
        body: { imagem: base64, tipo_midia: arquivo.type },
      });

      if (error) throw error;
      if (data?.erro) throw new Error(data.erro);
      return data.sugestao as SugestaoDocumento;
    },
  });
}

/** A leitura de documento só aparece se a função estiver configurada. */
export function useLeituraDisponivel() {
  const query = useQuery({
    queryKey: ["leitura-documento-disponivel"],
    queryFn: async (): Promise<boolean> => {
      try {
        const { data, error } = await supabase.functions.invoke("ler-documento", {
          body: { ping: true },
        });
        if (error) return false;
        return data?.disponivel === true;
      } catch {
        return false;
      }
    },
    staleTime: 10 * 60_000,
    retry: false,
  });

  return query.data === true;
}
