import { IMAGES } from "@/lib/data";

const StorySection = () => (
  <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
    <div className="overflow-hidden relative group">
      <img src={IMAGES.pottery} alt="Artesão" className="w-full h-full object-cover saturate-[0.8] brightness-[0.9] group-hover:scale-[1.02] transition-transform duration-[600ms]" />
    </div>
    <div className="bg-parchment p-10 md:p-[56px] flex flex-col justify-center">
      <div className="text-[0.64rem] tracking-[0.22em] uppercase text-terra mb-3">Nossa história</div>
      <h2 className="font-display font-normal text-[2.3rem] leading-[1.14] mb-5">
        Cinco séculos de<br /><em className="italic text-terra">maestria artesanal</em>
      </h2>
      <p className="text-[0.86rem] font-light leading-[1.9] text-muted-foreground mb-6">
        O artesanato brasileiro atravessa cinco séculos de fusão cultural — sabedoria indígena, herança africana e técnica europeia — tecidos em cada peça. Ao comprar na Feito à Mão, você leva uma tradição viva para casa.
      </p>
      <div className="flex gap-6 pt-6 border-t border-border">
        {[
          { n: "500+", l: "Anos de tradição" },
          { n: "27", l: "Estados brasileiros" },
          { n: "50+", l: "Países atendidos" },
        ].map((f, i) => (
          <div key={i}>
            <div className="font-display text-[1.85rem] text-terra">{f.n}</div>
            <div className="text-[0.62rem] tracking-[0.1em] uppercase text-muted-foreground">{f.l}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StorySection;
