import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPriceCents, STATUS_MAP } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";

const OrderConfirmationPage = () => {
  const { id } = useParams<{ id: string }>();
  usePageMeta("Seu pedido");
  const [qrCodeImagem, setQrCodeImagem] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [copiadoBoleto, setCopiadoBoleto] = useState(false);

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

  const codigoPix = pedido?.pix_qr_code ?? null;

  useEffect(() => {
    if (!codigoPix) {
      setQrCodeImagem(null);
      return;
    }
    QRCode.toDataURL(codigoPix, { width: 220, margin: 1 })
      .then(setQrCodeImagem)
      .catch(() => setQrCodeImagem(null));
  }, [codigoPix]);

  const copiarCodigoPix = async () => {
    if (!codigoPix) return;
    try {
      await navigator.clipboard.writeText(codigoPix);
      setCopiado(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o código manualmente.");
    }
  };

  const copiarLinhaBoleto = async () => {
    if (!pedido?.boleto_line) return;
    try {
      await navigator.clipboard.writeText(pedido.boleto_line);
      setCopiadoBoleto(true);
      toast.success("Número do boleto copiado!");
      setTimeout(() => setCopiadoBoleto(false), 2000);
    } catch {
      toast.error("Não foi possível copiar automaticamente. Selecione o número manualmente.");
    }
  };

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

      {pedido.payment_method === "pix" && codigoPix && pedido.status === "pending" && (
        <div className="border border-border p-6 mb-6 text-left">
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground mb-3 text-center">Pague com Pix</div>

          {qrCodeImagem && (
            <div className="flex justify-center mb-4">
              <img src={qrCodeImagem} alt="QR Code do Pix" className="w-[220px] h-[220px] border border-border" />
            </div>
          )}

          <textarea readOnly value={codigoPix} className="w-full border border-border p-2 text-[0.7rem] font-mono h-20 mb-2" />
          <button
            onClick={copiarCodigoPix}
            className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-body text-[0.7rem] tracking-[0.1em] uppercase font-medium py-3 hover:bg-espresso transition-colors"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? "Código copiado" : "Copiar código Pix"}
          </button>
          <p className="text-[0.72rem] text-muted-foreground mt-3 text-center">
            Escaneie o QR code ou copie o código no app do seu banco. Esta página atualiza sozinha assim que o pagamento é confirmado.
          </p>
        </div>
      )}

      {pedido.payment_method === "boleto" && pedido.boleto_url && pedido.status === "pending" && (
        <div className="border border-border p-6 mb-6 text-left">
          <div className="text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground mb-3">Pague com boleto</div>

          {pedido.boleto_line && (
            <>
              <input readOnly value={pedido.boleto_line} className="w-full border border-border p-2 text-[0.72rem] font-mono mb-2" />
              <button
                onClick={copiarLinhaBoleto}
                className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-body text-[0.7rem] tracking-[0.1em] uppercase font-medium py-3 hover:bg-espresso transition-colors mb-3"
              >
                {copiadoBoleto ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiadoBoleto ? "Número copiado" : "Copiar número do boleto"}
              </button>
            </>
          )}

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
