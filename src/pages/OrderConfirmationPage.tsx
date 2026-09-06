import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPriceCents, STATUS_MAP } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";

const OrderConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  usePageMeta("Seu pedido");

  const { data: pedido, isLoading } = useQuery({
    queryKey: ["pedido", id],
    enabled: !!id,
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !pedido) {
    return <div className="min-h-[60vh] flex items-center justify-center text-[0.82rem] text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="max-w-[560px] mx-auto px-4 py-14 sm:py-20 text-center">
      <div className="text-[0.62rem] tracking-[0.2em] uppercase text-terra mb-3">Pedido #{pedido.number}</div>
      <h1 className="font-display text-[1.8rem] sm:text-[2.2rem] font-light mb-2">Obrigado pela compra!</h1>
      <p className="text-[0.84rem] text-muted-foreground mb-6">
        Status atual: <strong className="text-foreground">{STATUS_MAP[pedido.status]?.label ?? pedido.status}</strong>
      </p>

      {pedido.payment_method === "pix" && pedido.pix_qr_code && pedido.status === "pending" && (
        <div className="border border-border p-6 mb-6 text-left">
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground mb-3">Pague com Pix</div>
          <textarea readOnly value={pedido.pix_qr_code} className="w-full border border-border p-2 text-[0.7rem] font-mono h-24" />
          <p className="text-[0.72rem] text-muted-foreground mt-2">Copie o código acima no app do seu banco. Esta página atualiza sozinha assim que o pagamento é confirmado.</p>
        </div>
      )}

      {pedido.payment_method === "boleto" && pedido.boleto_url && pedido.status === "pending" && (
        <div className="border border-border p-6 mb-6 text-left">
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground mb-3">Pague com boleto</div>
          <a href={pedido.boleto_url} target="_blank" rel="noreferrer" className="text-terra underline text-[0.82rem]">
            Abrir boleto
          </a>
        </div>
      )}

      {pedido.payment_error && (
        <p className="text-[0.78rem] text-destructive mb-6">{pedido.payment_error}</p>
      )}

      <div className="font-display text-[1.3rem] mb-8">{formatPriceCents(pedido.total_cents)}</div>

      <Link to="/catalogo" className="text-[0.74rem] tracking-[0.1em] uppercase text-terra hover:underline">
        Continuar comprando
      </Link>
    </div>
  );
};

export default OrderConfirmationPage;
