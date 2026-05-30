const cards = [
  { icon: "✈️", title: "Enviamos para o Mundo", desc: "Entrega em mais de 50 países. Frete rastreável e segurado de porta a porta." },
  { icon: "🔒", title: "Pagamento Seguro", desc: "USD, EUR, BRL e mais. Checkout com proteção total ao comprador." },
  { icon: "📦", title: "Embalagem Cuidadosa", desc: "Cada peça é embalada individualmente para chegar perfeita até você." },
  { icon: "↩️", title: "Devolução Fácil", desc: "30 dias para devoluções sem burocracia. Garantia em todos os artesãos." },
];

const ShippingSection = () => (
  <section className="bg-espresso py-12 sm:py-[52px] px-4 md:px-9">
    <div className="max-w-[1320px] mx-auto">
      <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-parchment/30 mb-2">Entregamos em todo lugar</div>
      <h2 className="font-display font-light text-[1.65rem] sm:text-[2.1rem] text-parchment">
        Entrega <em className="italic text-gold-light">Global</em>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px mt-7 sm:mt-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-parchment/[0.04] border border-parchment/[0.07] p-5 sm:p-6 hover:bg-parchment/[0.07] transition-colors">
            <div className="text-[1.5rem] sm:text-[1.7rem] mb-3">{c.icon}</div>
            <div className="font-display text-[1.05rem] sm:text-[1.12rem] text-parchment mb-2">{c.title}</div>
            <div className="text-[0.74rem] sm:text-[0.76rem] font-light text-parchment/40 leading-[1.7]">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShippingSection;
