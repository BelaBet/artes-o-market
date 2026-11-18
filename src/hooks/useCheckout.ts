import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { CartItem } from "@/contexts/CartContext";

export type Endereco = {
  zipcode: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export type DadosComprador = {
  name: string;
  email: string;
  phone?: string;
  document?: string;
};

export type MetodoPagamento = "pix" | "credit_card" | "boleto";

export function useCheckout() {
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const finalizar = async (
    itens: CartItem[],
    comprador: DadosComprador,
    endereco: Endereco | null,
    metodo: MetodoPagamento,
    installments = 1,
    cardToken?: string,
  ): Promise<Tables<"orders"> | null> => {
    setProcessando(true);
    setErro(null);
    try {
      const { data: pedido, error: erroPedido } = await supabase.rpc("criar_pedido", {
        _itens: itens.map((i) => ({ kind: i.kind, id: i.id, quantity: i.qty })),
        _buyer_name: comprador.name,
        _buyer_email: comprador.email,
        _buyer_phone: comprador.phone || null,
        _buyer_document: comprador.document || null,
        _shipping: endereco ?? {},
        _shipping_cents: 0,
      });
      if (erroPedido) throw erroPedido;

      const { data: pedidoComPagamento, error: erroPagamento } = await supabase.rpc("definir_pagamento", {
        _order_id: pedido.id,
        _metodo: metodo,
        _installments: installments,
      });
      if (erroPagamento) throw erroPagamento;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data: cobranca, error: erroCobranca } = await supabase.functions.invoke("pagarme-checkout", {
        body: { order_id: pedido.id, card_token: cardToken },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (erroCobranca) {
        // Pra qualquer status != 2xx, o supabase-js joga um erro genérico
        // ("Edge Function returned a non-2xx status code") e descarta o
        // corpo — a mensagem real que a função mandou (ex.: "The item
        // Code is required") só existe dentro de context, a Response bruta.
        let mensagem = erroCobranca.message;
        const contexto = (erroCobranca as { context?: Response }).context;
        if (contexto instanceof Response) {
          try {
            const corpo = await contexto.clone().json();
            if (corpo?.error) mensagem = corpo.error;
          } catch {
            // corpo não é JSON: mantém a mensagem genérica
          }
        }
        throw new Error(mensagem);
      }
      if (cobranca?.error) throw new Error(cobranca.error);

      const { data: pedidoFinal } = await supabase.from("orders").select("*").eq("id", pedido.id).single();
      return pedidoFinal ?? pedidoComPagamento;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível concluir a compra.");
      return null;
    } finally {
      setProcessando(false);
    }
  };

  return { finalizar, processando, erro };
}
