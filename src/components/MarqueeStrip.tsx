const items = ["Feito no Brasil", "Enviamos para o Mundo", "Direto do Artesão", "Autêntico & Único", "Checkout Seguro", "50+ Países"];

const MarqueeStrip = () => (
  <div className="bg-terra py-2.5 overflow-hidden whitespace-nowrap">
    <div className="inline-block animate-marquee">
      {Array(4).fill(null).map((_, i) =>
        items.map((txt) => (
          <span key={`${i}-${txt}`} className="inline-block mx-6 text-[0.64rem] tracking-[0.2em] uppercase text-background/80 font-medium">
            {txt}<span className="inline-block mx-3 opacity-40">◆</span>
          </span>
        ))
      )}
    </div>
  </div>
);

export default MarqueeStrip;
