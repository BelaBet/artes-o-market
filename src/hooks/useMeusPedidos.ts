import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ItemDaCompra {
  title: string;
  quantity: number;
  totalCents: number;
}

export interface MinhaCompra {
  id: string;
  number: number;
  status: string;
  paymentMethod: string | null;
  totalCents: number;
  createdAt: string;
  items: ItemDaCompra[];
}

/** Histórico de compras de quem está logado — "Minhas Compras". */
export function useMeusPedidos() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["meus-pedidos", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MinhaCompra[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, number, status, payment_method, total_cents, created_at, order_items(title, quantity, total_cents)")
        .eq("buyer_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((o) => ({
        id: o.id,
        number: o.number,
        status: o.status,
        paymentMethod: o.payment_method,
        totalCents: o.total_cents,
        createdAt: o.created_at,
        items: o.order_items ?? [],
      }));
    },
    staleTime: 15_000,
  });

  return { pedidos: query.data ?? [], loading: query.isLoading };
}
