import ProductGrid from "@/components/ProductGrid";
import { formatPrice } from "@/lib/data";

interface CatalogPageProps {
  onAddToCart: () => void;
}

const CatalogPage = ({ onAddToCart }: CatalogPageProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-[235px_1fr] min-h-[80vh]">
    <aside className="bg-parchment border-r border-border p-6">
      <div className="font-display text-[1.08rem] mb-5 pb-3 border-b border-border">Filtros</div>
      {[
        { label: "Categoria", opts: ["Cerâmica", "Madeira", "Macramê", "Palha", "Pedra-Sabão"] },
        { label: "Avaliação", opts: ["5 estrelas", "4+ estrelas", "3+ estrelas"] },
        { label: "Estado", opts: ["Minas Gerais", "Bahia", "Pernambuco", "São Paulo"] },
      ].map((g) => (
        <div key={g.label} className="mb-5">
          <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">{g.label}</div>
          {g.opts.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[0.78rem] mb-1.5 cursor-pointer hover:text-terra transition-colors">
              <input type="checkbox" className="accent-terra" />{o}
            </label>
          ))}
        </div>
      ))}
      <div className="mb-5">
        <div className="text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground mb-2">Faixa de preço</div>
        <input type="range" min="0" max="500" defaultValue={250} className="w-full accent-terra my-2" />
        <div className="flex justify-between text-[0.7rem] text-muted-foreground">
          <span>{formatPrice(0)}</span><span>{formatPrice(500)}</span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[0.78rem] cursor-pointer hover:text-terra transition-colors mt-1">
        <input type="checkbox" className="accent-terra" />✈️ Frete grátis
      </label>
    </aside>
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
        <span className="font-display text-[0.98rem] text-muted-foreground"><strong className="text-foreground">856</strong> produtos encontrados</span>
        <select className="border border-border bg-transparent px-2.5 py-1.5 font-body text-[0.7rem] tracking-[0.06em] outline-none cursor-pointer">
          <option>Relevância</option><option>Menor preço</option><option>Melhor avaliação</option><option>Mais novos</option>
        </select>
      </div>
      <ProductGrid onAddToCart={onAddToCart} />
    </div>
  </div>
);

export default CatalogPage;
