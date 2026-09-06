import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PedidoDaLoja {
  orderId: string;
  itemId: string;
  number: number;
  buyerName: string;
  title: string;
  quantity: number;
  totalCents: number;
  artisanAmountCents: number;
  status: string;
  createdAt: string;
}

export function usePedidosDaLoja(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["pedidos-da-loja", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<PedidoDaLoja[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id, order_id, title, quantity, total_cents, artisan_amount_cents,
          orders(number, buyer_name, status, created_at)
        `)
        .eq("artisan_id", artisanId!)
        .order("order_id", { ascending: false });
      if (error) throw error;
      return (data ?? [])
        .filter((i) => i.orders)
        .map((i) => ({
          orderId: i.order_id,
          itemId: i.id,
          number: i.orders!.number,
          buyerName: i.orders!.buyer_name,
          title: i.title,
          quantity: i.quantity,
          totalCents: i.total_cents,
          artisanAmountCents: i.artisan_amount_cents,
          status: i.orders!.status,
          createdAt: i.orders!.created_at,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    staleTime: 15_000,
  });

  return { pedidos: query.data ?? [], loading: query.isLoading };
}

export interface ResumoFinanceiro {
  receitaPagaCents: number;
  pedidosPagos: number;
  produtosAtivos: number;
  avaliacaoMedia: number | null;
}

export function useResumoFinanceiro(artisanId: string | undefined) {
  const query = useQuery({
    queryKey: ["resumo-financeiro", artisanId],
    enabled: !!artisanId,
    queryFn: async (): Promise<ResumoFinanceiro> => {
      const [{ data: itens }, { count: produtosAtivos }, { data: avaliacoes }] = await Promise.all([
        supabase
          .from("order_items")
          .select("artisan_amount_cents, order_id, orders(status)")
          .eq("artisan_id", artisanId!),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("artisan_id", artisanId!).eq("status", "active"),
        supabase.from("reviews").select("rating").eq("artisan_id", artisanId!),
      ]);

      const pagos = (itens ?? []).filter((i) => i.orders?.status === "paid");
      const receitaPagaCents = pagos.reduce((sum, i) => sum + i.artisan_amount_cents, 0);
      const pedidosPagos = new Set(pagos.map((i) => i.order_id)).size;
      const notas = avaliacoes ?? [];

      return {
        receitaPagaCents,
        pedidosPagos,
        produtosAtivos: produtosAtivos ?? 0,
        avaliacaoMedia: notas.length ? notas.reduce((s, r) => s + r.rating, 0) / notas.length : null,
      };
    },
    staleTime: 15_000,
  });

  return query.data ?? { receitaPagaCents: 0, pedidosPagos: 0, produtosAtivos: 0, avaliacaoMedia: null };
}
