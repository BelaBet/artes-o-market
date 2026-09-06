import stoneImg from "@/assets/stone.jpg";
import weaveImg from "@/assets/weave.jpg";
import woodImg from "@/assets/wood.jpg";
import straw1Img from "@/assets/straw1.jpg";
import potteryImg from "@/assets/pottery.jpg";
import ceramicImg from "@/assets/ceramic.jpg";
import basketImg from "@/assets/basket.jpg";
import straw2Img from "@/assets/straw2.jpg";

// Imagens decorativas (hero, seções institucionais) — não fazem parte
// do catálogo real, que vem do Supabase (ver src/hooks/useProdutos.ts).
export const IMAGES: Record<string, string> = {
  stone: stoneImg,
  weave: weaveImg,
  wood: woodImg,
  straw1: straw1Img,
  pottery: potteryImg,
  ceramic: ceramicImg,
  basket: basketImg,
  straw2: straw2Img,
};

/**
 * Cor média de cada imagem — usada como placeholder enquanto o arquivo
 * carrega. Evita o "buraco branco" no card e reduz a sensação de layout
 * quebrado no mobile, onde as fotos chegam bem depois do HTML.
 */
export const IMAGE_TINTS: Record<string, string> = {
  basket: "#815F51",
  ceramic: "#9B5F36",
  pottery: "#826549",
  stone: "#8C6744",
  straw1: "#CC914B",
  straw2: "#B8864A",
  weave: "#9A6E44",
  wood: "#845A35",
};

export const BADGE_MAP: Record<string, { className: string; label: string }> = {
  dest: { className: "bg-espresso text-gold-light", label: "Destaque" },
  novo: { className: "bg-sage text-primary-foreground", label: "Novo" },
  off: { className: "border border-terra text-terra", label: "Promoção" },
};

/** Rótulos para o enum public.order_status do banco. */
export const STATUS_MAP: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-gold/10 text-gold", label: "Aguardando pagamento" },
  paid: { className: "bg-sage/10 text-sage", label: "Pago" },
  processing: { className: "bg-terra/10 text-terra", label: "Em produção" },
  shipped: { className: "bg-terra/10 text-terra", label: "Enviado" },
  delivered: { className: "bg-espresso/10 text-espresso", label: "Entregue" },
  canceled: { className: "bg-destructive/10 text-destructive", label: "Cancelado" },
  refunded: { className: "bg-destructive/10 text-destructive", label: "Estornado" },
};

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatPrice(brl: number): string {
  return BRL.format(brl);
}

export function formatPriceCents(cents: number): string {
  return BRL.format(cents / 100);
}
