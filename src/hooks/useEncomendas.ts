import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Encomenda = Tables<"custom_requests">;
export type TipoEncomenda = Encomenda["request_type"];
export type StatusEncomenda = Encomenda["status"];

export const TIPOS: { tipo: TipoEncomenda; rotulo: string; descricao: string }[] = [
  { tipo: "personalizar", rotulo: "Personalizar uma peça que já existe", descricao: "Mudar tamanho, cor, acabamento" },
  { tipo: "peca_nova", rotulo: "Criar uma peça nova", descricao: "Você tem uma ideia e quer alguém para fazer" },
  { tipo: "quantidade", rotulo: "Produzir várias unidades", descricao: "A mesma peça, em quantidade" },
  { tipo: "brindes", rotulo: "Brindes para uma empresa", descricao: "Presentes personalizados" },
  { tipo: "evento", rotulo: "Peças para um evento", descricao: "Casamento, festa, confraternização" },
  { tipo: "decoracao", rotulo: "Projeto de decoração", descricao: "Várias peças para um ambiente" },
  { tipo: "loja", rotulo: "Algo para minha loja", descricao: "Revenda ou peças exclusivas" },
  { tipo: "hotelaria", rotulo: "Para hotel, pousada ou restaurante", descricao: "Ambientação e enxoval" },
  { tipo: "arquitetura", rotulo: "Projeto de arquitetura ou decoração", descricao: "Com planta, medidas ou moodboard" },
  { tipo: "outro", rotulo: "Outro", descricao: "Conte do seu jeito" },
];

export const ROTULO_STATUS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  em_distribuicao: "Procurando artesãos",
  recebendo_propostas: "Recebendo propostas",
  em_negociacao: "Em negociação",
  proposta_escolhida: "Proposta escolhida",
  aguardando_pagamento: "Aguardando pagamento",
  confirmada: "Confirmada",
  em_producao: "Em produção",
  pronta_para_envio: "Pronta para envio",
  enviada_ao_cliente: "Enviada",
  entregue: "Entregue",
  concluida: "Concluída",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

export const FAIXAS_ORCAMENTO = [
  { rotulo: "Até R$ 200", min: 0, max: 20000 },
  { rotulo: "R$ 201 a R$ 500", min: 20100, max: 50000 },
  { rotulo: "R$ 501 a R$ 1.000", min: 50100, max: 100000 },
  { rotulo: "R$ 1.001 a R$ 5.000", min: 100100, max: 500000 },
  { rotulo: "Acima de R$ 5.000", min: 500000, max: null },
  { rotulo: "Prefiro receber uma proposta", min: null, max: null },
];

export const FAIXAS_QUANTIDADE = [
  { rotulo: "1 unidade", min: 1, max: 1 },
  { rotulo: "2 a 10", min: 2, max: 10 },
  { rotulo: "11 a 50", min: 11, max: 50 },
  { rotulo: "51 a 100", min: 51, max: 100 },
  { rotulo: "Mais de 100", min: 101, max: null },
  { rotulo: "Ainda não sei", min: null, max: null },
];

/**
 * Cria (ou recupera) o rascunho em que o comprador está trabalhando.
 *
 * O rascunho nasce no banco desde a primeira tela: assim a pessoa pode
 * fechar o navegador no meio e voltar depois sem perder nada.
 */
export function useRascunho(rascunhoId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rascunho-encomenda", rascunhoId, user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Encomenda | null> => {
      if (rascunhoId) {
        const { data, error } = await supabase
          .from("custom_requests")
          .select("*")
          .eq("id", rascunhoId)
          .maybeSingle();
        if (error) throw error;
        return data;
      }

      const { data } = await supabase
        .from("custom_requests")
        .select("*")
        .eq("buyer_user_id", user!.id)
        .eq("status", "rascunho")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return data ?? null;
    },
    staleTime: 10_000,
  });

  const criar = useMutation({
    mutationFn: async (tipo: TipoEncomenda): Promise<Encomenda> => {
      const { data, error } = await supabase
        .from("custom_requests")
        .insert({ buyer_user_id: user!.id, request_type: tipo, status: "rascunho" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rascunho-encomenda"] }),
  });

  return { rascunho: query.data ?? null, loading: query.isLoading, criar: criar.mutateAsync };
}

export type EstadoSalvamento = "ocioso" | "salvando" | "salvo" | "erro";

/** Mesma lógica de salvamento automático do painel: 900 ms após parar. */
export function useSalvarEncomenda(requestId: string | undefined) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoSalvamento>("ocioso");
  const pendentes = useRef<Partial<Encomenda>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const gravar = useCallback(async () => {
    if (!requestId) return;
    const dados = pendentes.current;
    pendentes.current = {};
    if (Object.keys(dados).length === 0) return;

    setEstado("salvando");
    const { error } = await supabase.from("custom_requests").update(dados).eq("id", requestId);

    if (error) {
      pendentes.current = { ...dados, ...pendentes.current };
      setEstado("erro");
      return;
    }
    setEstado("salvo");
    queryClient.invalidateQueries({ queryKey: ["rascunho-encomenda"] });
  }, [requestId, queryClient]);

  const salvar = useCallback(
    (campos: Partial<Encomenda>) => {
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

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    void gravar();
  }, [gravar]);

  return { salvar, salvarAgora, estado, tentarNovamente: salvarAgora };
}

export function useEnviarEncomenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string): Promise<Encomenda> => {
      const { data, error } = await supabase.rpc("enviar_encomenda", {
        _request_id: requestId,
      });
      if (error) throw error;
      return data as unknown as Encomenda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rascunho-encomenda"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-encomendas"] });
    },
  });
}

// ---------------------------------------------------------------------
// Comprador
// ---------------------------------------------------------------------
export interface EncomendaComRespostas extends Encomenda {
  custom_request_matches: { id: string; response_status: string }[] | null;
}

export function useMinhasEncomendas() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["minhas-encomendas", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<EncomendaComRespostas[]> => {
      const { data, error } = await supabase
        .from("custom_requests")
        .select("*, custom_request_matches ( id, response_status )")
        .eq("buyer_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EncomendaComRespostas[];
    },
    staleTime: 30_000,
  });

  return { encomendas: query.data ?? [], loading: query.isLoading };
}

// ---------------------------------------------------------------------
// Artesão
// ---------------------------------------------------------------------
export interface EncaminhamentoComPedido {
  id: string;
  response_status: string;
  match_score: number;
  match_reasons: string[];
  sent_at: string;
  viewed_at: string | null;
  custom_requests: Encomenda | null;
}

export function useEncomendasDaLoja(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["encomendas-loja", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<EncaminhamentoComPedido[]> => {
      const { data, error } = await supabase
        .from("custom_request_matches")
        .select(
          "id, response_status, match_score, match_reasons, sent_at, viewed_at, " +
            "custom_requests ( * )",
        )
        .eq("artisan_id", artisanId!)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EncaminhamentoComPedido[];
    },
    staleTime: 30_000,
  });

  return { encaminhamentos: query.data ?? [], loading: query.isLoading };
}

export type RespostaArtesao = "interessado" | "mais_informacoes" | "recusada" | "visualizada";

export function useResponderEncomenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { requestId: string; resposta: RespostaArtesao; motivo?: string }) => {
      const { error } = await supabase.rpc("responder_encomenda", {
        _request_id: args.requestId,
        _resposta: args.resposta,
        _motivo: args.motivo ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encomendas-loja"] });
    },
  });
}

// ---------------------------------------------------------------------
// Anexos (bucket privado — leitura por URL assinada)
// ---------------------------------------------------------------------
export function useAnexos(requestId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const chave = ["anexos-encomenda", requestId];

  const query = useQuery({
    queryKey: chave,
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_request_attachments")
        .select("*")
        .eq("request_id", requestId!)
        .order("created_at");
      if (error) throw error;

      // O bucket é privado: cada arquivo precisa de uma URL assinada.
      return Promise.all(
        (data ?? []).map(async (anexo) => {
          const { data: assinada } = await supabase.storage
            .from("encomendas")
            .createSignedUrl(anexo.storage_path, 60 * 60);
          return { ...anexo, url: assinada?.signedUrl ?? null };
        }),
      );
    },
    staleTime: 30 * 60_000,
  });

  const enviar = useMutation({
    mutationFn: async (arquivo: File) => {
      if (!requestId || !user) throw new Error("Encomenda não encontrada");
      if (arquivo.size > 10 * 1024 * 1024) {
        throw new Error("O arquivo passou de 10 MB.");
      }

      const nomeLimpo = arquivo.name.replace(/[^\w.-]/g, "_");
      const caminho = `${requestId}/${Date.now()}-${nomeLimpo}`;

      const { error: erroUpload } = await supabase.storage
        .from("encomendas")
        .upload(caminho, arquivo, { contentType: arquivo.type });
      if (erroUpload) throw erroUpload;

      const { error } = await supabase.from("custom_request_attachments").insert({
        request_id: requestId,
        uploaded_by: user.id,
        storage_path: caminho,
        file_name: arquivo.name,
        file_type: arquivo.type,
        file_size: arquivo.size,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chave }),
  });

  return {
    anexos: query.data ?? [],
    loading: query.isLoading,
    enviar: enviar.mutateAsync,
    enviando: enviar.isPending,
  };
}
