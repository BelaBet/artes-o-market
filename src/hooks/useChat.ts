import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { resolverImagem } from "@/lib/imagens";

export interface ConversaResumo {
  id: string;
  otherName: string;
  otherImg: string | null;
  lastMessageAt: string;
  isArtisanSide: boolean;
}

export interface MensagemChat {
  id: string;
  body: string;
  createdAt: string;
  fromMe: boolean;
}

export function useConversas() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["conversas", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ConversaResumo[]> => {
      // RLS já restringe às conversas em que o usuário é comprador ou dono da loja.
      const { data, error } = await supabase
        .from("conversations")
        .select("id, buyer_user_id, last_message_at, artisans(shop_name, public_name, avatar_url)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const linhas = data ?? [];

      const buyerIds = [...new Set(linhas.map((c) => c.buyer_user_id))];
      const { data: perfis } = buyerIds.length
        ? await supabase.from("profiles_publicos").select("user_id, display_name, avatar_url").in("user_id", buyerIds)
        : { data: [] as { user_id: string; display_name: string | null; avatar_url: string | null }[] };
      const perfilPorId = new Map((perfis ?? []).map((p) => [p.user_id, p]));

      return linhas.map((c): ConversaResumo => {
        const souArtesao = c.buyer_user_id !== user!.id;
        if (souArtesao) {
          const perfil = perfilPorId.get(c.buyer_user_id);
          return {
            id: c.id,
            otherName: perfil?.display_name || "Comprador",
            otherImg: resolverImagem(perfil?.avatar_url),
            lastMessageAt: c.last_message_at,
            isArtisanSide: true,
          };
        }
        return {
          id: c.id,
          otherName: c.artisans?.public_name || c.artisans?.shop_name || "Loja",
          otherImg: resolverImagem(c.artisans?.avatar_url),
          lastMessageAt: c.last_message_at,
          isArtisanSide: false,
        };
      });
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  return { conversas: query.data ?? [], loading: query.isLoading };
}

export function useMensagens(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["mensagens", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<MensagemChat[]> => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, created_at, sender_id")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.created_at,
        fromMe: m.sender_id === user?.id,
      }));
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
  });

  const enviar = useCallback(
    async (body: string) => {
      if (!conversationId || !user || !body.trim()) return;
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: user.id, body: body.trim() });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["mensagens", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
    },
    [conversationId, user, queryClient],
  );

  return { mensagens: query.data ?? [], loading: query.isLoading, enviar };
}

/** Abre a conversa com um artesão, reaproveitando uma já existente. */
export function useIniciarConversa() {
  const { user } = useAuth();

  return useCallback(
    async (artisanId: string): Promise<string | null> => {
      if (!user) return null;
      const { data: existente } = await supabase
        .from("conversations")
        .select("id")
        .eq("artisan_id", artisanId)
        .eq("buyer_user_id", user.id)
        .maybeSingle();
      if (existente) return existente.id;

      const { data, error } = await supabase
        .from("conversations")
        .insert({ artisan_id: artisanId, buyer_user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    [user],
  );
}
