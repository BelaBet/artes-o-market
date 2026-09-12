import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Recebimento {
  recipientId: string | null;
  status: string | null;
  canWithdraw: boolean;
}

export function useRecebimento(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["recebimento", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<Recebimento> => {
      const { data, error } = await supabase
        .from("artisan_billing")
        .select("pagarme_recipient_id, recipient_status, can_withdraw")
        .eq("artisan_id", artisanId!)
        .maybeSingle();
      if (error) throw error;
      return {
        recipientId: data?.pagarme_recipient_id ?? null,
        status: data?.recipient_status ?? null,
        canWithdraw: data?.can_withdraw ?? false,
      };
    },
    staleTime: 15_000,
  });

  return { recebimento: query.data ?? null, loading: query.isLoading };
}

export interface DadosRecebedor {
  type: "individual" | "company";
  name: string;
  document: string;
  email: string;
  bankAccount: {
    bank: string;
    branchNumber: string;
    accountNumber: string;
    accountCheckDigit: string;
    accountType: "checking" | "savings";
  };
}

export function useCriarRecebedor(artisanId: string | undefined) {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const criar = useCallback(
    async (dados: DadosRecebedor): Promise<boolean> => {
      setSalvando(true);
      setErro(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("criar-recebedor", {
          body: dados,
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        queryClient.invalidateQueries({ queryKey: ["recebimento", artisanId] });
        return true;
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível cadastrar o recebimento.");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [artisanId, queryClient],
  );

  return { criar, salvando, erro };
}
