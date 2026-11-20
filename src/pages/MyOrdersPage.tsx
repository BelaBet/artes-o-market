import { Link } from "react-router-dom";
import { useMeusPedidos } from "@/hooks/useMeusPedidos";
import { formatPriceCents, STATUS_MAP } from "@/lib/data";
import { usePageMeta } from "@/hooks/usePageMeta";

const MyOrdersPage = () => {
  usePageMeta("Minhas Compras");
  const { pedidos, loading } = useMeusPedidos();

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-9 py-10 sm:py-14">
      <h1 className="font-display text-[1.8rem] sm:text-[2.2rem] font-light mb-1">Minhas Compras</h1>
      <p className="text-[0.82rem] text-muted-foreground mb-8">Acompanhe seus pedidos e pagamentos.</p>

      {loading ? (
        <p className="text-[0.82rem] text-muted-foreground">Carregando…</p>
      ) : pedidos.length === 0 ? (
        <div className="border border-border bg-background py-16 px-6 text-center">
          <div className="font-display text-[1.15rem] mb-1">Você ainda não fez nenhuma compra</div>
          <Link to="/catalogo" className="text-terra underline text-[0.82rem]">
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {pedidos.map((p) => (
            <Link
              key={p.id}
              to={`/pedido/${p.id}`}
              className="flex items-center gap-3 p-4 hover:bg-parchment/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-times text-[0.78rem] font-medium">
                    Pedido #<span>{p.number}</span>
                  </span>
                  <span className={`inline-block text-[0.55rem] tracking-[0.1em] uppercase font-semibold px-2 py-0.5 w-fit ${STATUS_MAP[p.status]?.className ?? ""}`}>
                    {STATUS_MAP[p.status]?.label ?? p.status}
                  </span>
                </div>
                <div className="text-[0.72rem] text-muted-foreground truncate">
                  {p.items.map((i) => `${i.title} × ${i.quantity}`).join(", ")}
                </div>
                <div className="text-[0.64rem] text-muted-foreground mt-0.5">
                  {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <span className="font-times text-[0.92rem] font-medium shrink-0">{formatPriceCents(p.totalCents)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
