import { useState } from "react";
import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useMinhaLoja } from "@/hooks/useMinhaLoja";
import {
  ROTULO_STATUS,
  TIPOS,
  useEncomendasDaLoja,
  useResponderEncomenda,
  type RespostaArtesao,
} from "@/hooks/useEncomendas";

const MOTIVOS = [
  "Prazo curto",
  "Quantidade alta",
  "Material diferente do que trabalho",
  "Sem disponibilidade agora",
  "Valor incompatível",
  "Não trabalho com esse tipo",
];

const FILTROS = [
  { chave: "novas", rotulo: "Novas", status: ["pendente", "visualizada"] },
  { chave: "interesse", rotulo: "Com interesse", status: ["interessado", "mais_informacoes"] },
  { chave: "recusadas", rotulo: "Recusadas", status: ["recusada"] },
] as const;

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const Encomendas = () => {
  const { loja } = useMinhaLoja();
  const { encaminhamentos, loading } = useEncomendasDaLoja(loja?.id);
  const responder = useResponderEncomenda();

  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["chave"]>("novas");
  const [recusando, setRecusando] = useState<string | null>(null);

  const lista = encaminhamentos.filter((e) =>
    (FILTROS.find((f) => f.chave === filtro)?.status as readonly string[]).includes(
      e.response_status,
    ),
  );

  const enviarResposta = async (
    requestId: string,
    resposta: RespostaArtesao,
    motivo?: string,
  ) => {
    try {
      await responder.mutateAsync({ requestId, resposta, motivo });
      setRecusando(null);
      toast.success(
        resposta === "recusada"
          ? "Obrigado por avisar. Não mostramos o motivo ao comprador."
          : "Pronto! A conversa com o comprador foi aberta.",
      );
    } catch {
      toast.error("Não conseguimos registrar sua resposta agora.");
    }
  };

  if (loading || !loja) {
    return (
      <div className="max-w-[820px]">
        <Skeleton className="h-[1.8rem] w-1/3 rounded-none mb-5" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[8rem] w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[820px]">
      <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-1.5">
        Encomendas
      </div>
      <h2 className="font-display text-[1.5rem] sm:text-[1.85rem] font-light leading-tight mb-1">
        Pedidos que chegaram até você
      </h2>
      <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
        Encaminhamos apenas o que combina com o que você faz e com o que informou em Minha Loja.
      </p>

      {!loja.accepts_custom_orders && (
        <div className="border border-terra/40 bg-terra/5 px-4 py-3.5 mb-6">
          <p className="text-[0.83rem] font-light leading-[1.6]">
            Você ainda não marcou que aceita encomendas. Ative em{" "}
            <strong className="font-medium">Minha Loja → Como você vende</strong> para começar a
            receber pedidos.
          </p>
        </div>
      )}

      <div className="flex gap-2 mb-5 overflow-x-auto">
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            onClick={() => setFiltro(f.chave)}
            className={`shrink-0 font-body text-[0.68rem] tracking-[0.1em] uppercase px-3.5 py-2 border transition-colors ${
              filtro === f.chave
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
            }`}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="border border-border py-12 px-6 text-center">
          <div className="font-display text-[1.1rem] mb-1">Nada por aqui ainda</div>
          <p className="text-[0.82rem] text-muted-foreground font-light">
            {filtro === "novas"
              ? "Avisaremos assim que chegar um pedido compatível com seu trabalho."
              : "Nenhuma encomenda nesta situação."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((e) => {
            const pedido = e.custom_requests;
            if (!pedido) return null;

            return (
              <article key={e.id} className="border border-border bg-background p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="font-display text-[1.05rem] leading-tight">
                      {pedido.title ||
                        TIPOS.find((t) => t.tipo === pedido.request_type)?.rotulo ||
                        "Encomenda"}
                    </div>
                    <div className="text-[0.72rem] text-muted-foreground mt-0.5">
                      #{pedido.number} · {formatarData(pedido.created_at)}
                      {pedido.delivery_city &&
                        ` · ${pedido.delivery_city}${pedido.delivery_state ? `/${pedido.delivery_state}` : ""}`}
                    </div>
                  </div>
                  <span className="shrink-0 font-body text-[0.56rem] tracking-[0.12em] uppercase px-2 py-1 border border-border text-muted-foreground">
                    {ROTULO_STATUS[pedido.status] ?? pedido.status}
                  </span>
                </div>

                {pedido.description && (
                  <p className="text-[0.85rem] font-light leading-[1.65] mb-3 line-clamp-4">
                    {pedido.description}
                  </p>
                )}

                {(e.match_reasons?.length ?? 0) > 0 && (
                  <div className="text-[0.7rem] text-muted-foreground mb-4">
                    Chegou até você porque: {e.match_reasons.join(", ")}.
                  </div>
                )}

                {recusando === pedido.id ? (
                  <div className="border-t border-border pt-3">
                    <div className="font-body text-[0.68rem] tracking-[0.1em] uppercase text-muted-foreground mb-2">
                      Por que não consegue atender?
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {MOTIVOS.map((m) => (
                        <button
                          key={m}
                          onClick={() => enviarResposta(pedido.id, "recusada", m)}
                          className="border border-border px-3 py-2 font-body text-[0.72rem] hover:border-foreground transition-colors"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => enviarResposta(pedido.id, "recusada")}
                        className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground"
                      >
                        Prefiro não dizer
                      </button>
                      <button
                        onClick={() => setRecusando(null)}
                        className="font-body text-[0.7rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground"
                      >
                        Cancelar
                      </button>
                    </div>
                    <p className="text-[0.7rem] text-muted-foreground mt-2">
                      O motivo fica só com a plataforma — o comprador não vê.
                    </p>
                  </div>
                ) : (
                  ["pendente", "visualizada"].includes(e.response_status) && (
                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <button
                        onClick={() => enviarResposta(pedido.id, "interessado")}
                        disabled={responder.isPending}
                        className="flex items-center gap-1.5 bg-espresso text-parchment px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:brightness-125 transition-all disabled:opacity-50"
                      >
                        {responder.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Tenho interesse
                      </button>
                      <button
                        onClick={() => enviarResposta(pedido.id, "mais_informacoes")}
                        disabled={responder.isPending}
                        className="flex items-center gap-1.5 border border-border px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:border-foreground transition-colors disabled:opacity-50"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> Preciso de mais informações
                      </button>
                      <button
                        onClick={() => setRecusando(pedido.id)}
                        className="flex items-center gap-1.5 border border-border px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Não consigo atender
                      </button>
                    </div>
                  )
                )}

                {["interessado", "mais_informacoes"].includes(e.response_status) && (
                  <div className="border-t border-border pt-3 text-[0.8rem] font-light text-muted-foreground">
                    Você demonstrou interesse. A conversa com o comprador está aberta em{" "}
                    <strong className="font-medium text-foreground">Mensagens</strong>.
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Encomendas;
