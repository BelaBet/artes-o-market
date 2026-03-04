import { IMAGES } from "@/lib/data";

interface CTASectionProps {
  onNavigate: () => void;
}

const CTASection = ({ onNavigate }: CTASectionProps) => (
  <section className="py-[88px] px-9 bg-parchment text-center relative overflow-hidden">
    <div className="absolute inset-0 opacity-[0.07] bg-cover bg-center" style={{ backgroundImage: `url(${IMAGES.straw1})` }} />
    <div className="max-w-[520px] mx-auto relative">
      <div className="text-[0.63rem] tracking-[0.2em] uppercase text-terra mb-2 text-center">Para artesãos</div>
      <h2 className="font-display font-normal text-[2.7rem] mb-3">
        Venda seu artesanato<br /><em className="italic text-terra">para o mundo</em>
      </h2>
      <p className="text-[0.84rem] text-muted-foreground leading-[1.85] font-light mb-8">
        Junte-se a milhares de artesãos brasileiros que já exportam suas criações. Cadastro gratuito, suporte completo e alcance global.
      </p>
      <button
        onClick={onNavigate}
        className="bg-espresso text-parchment border-none px-10 py-3 cursor-pointer font-body font-medium text-[0.7rem] tracking-[0.16em] uppercase hover:brightness-125 hover:-translate-y-px transition-all"
      >
        Começar Agora
      </button>
    </div>
  </section>
);

export default CTASection;
