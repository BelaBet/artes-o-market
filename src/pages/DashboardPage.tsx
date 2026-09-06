import { useState } from "react";
import { STATUS_MAP, formatPriceCents } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useMinhaLoja } from "@/hooks/useMinhaLoja";
import { usePedidosDaLoja, useResumoFinanceiro } from "@/hooks/usePainelArtesao";
import MinhaLoja from "@/components/painel/MinhaLoja";
import ProdutosPainel from "@/components/painel/ProdutosPainel";

const VisaoGeralEPedidos = ({ artisanId }: { artisanId: string }) => {
  const { pedidos, loading } = usePedidosDaLoja(artisanId);
  const resumo = useResumoFinanceiro(artisanId);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: "◎", val: formatPriceCents(resumo.receitaPagaCents), label: "Receita" },
          { icon: "⬡", val: String(resumo.pedidosPagos), label: "Pedidos pagos" },
          { icon: "◈", val: String(resumo.produtosAtivos), label: "Produtos ativos" },
          { icon: "◇", val: resumo.avaliacaoMedia ? resumo.avaliacaoMedia.toFixed(1) : "—", label: "Avaliação" },
        ].map((m, i) => (
          <div key={i} className="bg-background border border-border p-3 sm:p-4 hover:border-terra transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[1.05rem]">{m.icon}</span>
            </div>
            <div className="font-display text-[1.4rem] sm:text-[1.75rem]">{m.val}</div>
            <div className="text-[0.6rem] sm:text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-background border border-border">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-display text-[0.95rem] sm:text-[1rem]">Pedidos</span>
        </div>
        {loading ? (
          <div className="p-4 text-[0.78rem] text-muted-foreground">Carregando…</div>
        ) : pedidos.length === 0 ? (
          <div className="p-4 text-[0.78rem] text-muted-foreground">Nenhum pedido ainda.</div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-5 gap-4 px-4 py-2 text-[0.6rem] tracking-[0.12em] uppercase text-muted-foreground border-b border-border">
              <span>Nº</span><span>Comprador</span><span>Peça</span><span>Valor</span><span>Status</span>
            </div>
            {pedidos.map((p) => (
              <div key={p.itemId} className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 items-start lg:items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-parchment/50 transition-colors">
                <span className="text-[0.72rem] font-medium text-muted-foreground">#{p.number}</span>
                <div className="lg:order-none order-2 col-span-2 lg:col-span-1">
                  <div className="text-[0.78rem] font-medium">{p.buyerName}</div>
                  <div className="text-[0.66rem] text-muted-foreground">{p.title} × {p.quantity}</div>
                </div>
                <span className="font-display text-[0.92rem] text-right lg:text-left">{formatPriceCents(p.totalCents)}</span>
                <span className={`inline-block text-[0.55rem] sm:text-[0.56rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 w-fit ${STATUS_MAP[p.status]?.className ?? ""}`}>
                  {STATUS_MAP[p.status]?.label ?? p.status}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
};

const DashboardPage = () => {
  const [tab, setTab] = useState("overview");
  usePageMeta("Painel do Artesão");
  const { loja } = useMinhaLoja();
  const tabs = [
    { key: "overview", icon: "⊞", label: "Visão Geral" },
    { key: "loja", icon: "⌂", label: "Minha História" },
    { key: "products", icon: "◈", label: "Produtos" },
    { key: "settings", icon: "⊙", label: "Configurações" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] min-h-[80vh]">
      <aside className="bg-espresso p-4 lg:p-4">
        <div className="font-display text-[0.88rem] text-parchment mb-1">Feito à Mão</div>
        <div className="text-[0.58rem] tracking-[0.14em] uppercase text-parchment/25 mb-4 lg:mb-6">Painel do Artesão</div>
        <div className="flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
          {tabs.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 bg-transparent border-none cursor-pointer font-body text-[0.7rem] tracking-[0.05em] py-2 px-2.5 mb-0 lg:mb-0.5 text-left transition-all border-l-2 lg:border-l-2 whitespace-nowrap shrink-0 ${
                tab === key
                  ? "text-gold-light border-l-terra bg-parchment/5"
                  : "text-parchment/40 border-l-transparent hover:text-parchment/70 hover:bg-parchment/[0.04]"
              }`}
            >
              <span className="opacity-50">{icon}</span>{label}
            </button>
          ))}
        </div>
      </aside>
      <main className="p-4 md:p-7 bg-background">
        {tab === "loja" ? (
          <MinhaLoja />
        ) : tab === "products" ? (
          loja ? <ProdutosPainel artisanId={loja.id} /> : <p className="text-[0.8rem] text-muted-foreground">Carregando sua loja…</p>
        ) : tab === "settings" ? (
          <p className="text-[0.82rem] text-muted-foreground">Em breve.</p>
        ) : (
          <>
            <div className="font-display text-[1.5rem] sm:text-[1.8rem] mb-1">
              Olá{loja?.public_name || loja?.shop_name ? `, ${loja.public_name || loja.shop_name}` : ""}! 👋
            </div>
            <div className="text-[0.72rem] sm:text-[0.74rem] text-muted-foreground mb-5 sm:mb-6">Resumo da sua loja</div>
            {loja ? (
              <VisaoGeralEPedidos artisanId={loja.id} />
            ) : (
              <p className="text-[0.8rem] text-muted-foreground">Carregando sua loja…</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
