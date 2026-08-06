import { Link } from "react-router-dom";
import { PenLine, Camera, Sparkles } from "lucide-react";
import MarketFooter from "@/components/MarketFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const PASSOS = [
  { n: "1", titulo: "Conte sua ideia", texto: "Escreva do seu jeito e envie fotos ou desenhos, se tiver." },
  { n: "2", titulo: "Encontramos artesãos", texto: "Encaminhamos seu projeto para quem trabalha com o que você precisa." },
  { n: "3", titulo: "Receba propostas", texto: "Cada artesão responde com preço, prazo e detalhes. Você escolhe." },
];

const ProjetosSobMedidaPage = () => {
  usePageMeta(
    "Projetos Sob Medida",
    "Conte sua ideia e encontre artesãos brasileiros que podem transformá-la em realidade. Peças personalizadas, encomendas e projetos completos.",
  );

  return (
    <>
      <section className="bg-espresso text-parchment px-4 md:px-9 py-14 sm:py-20">
        <div className="max-w-[820px] mx-auto text-center">
          <div className="font-body text-[0.6rem] tracking-[0.2em] uppercase text-gold-light mb-4">
            Projetos sob medida
          </div>
          <h1 className="font-display text-[2rem] sm:text-[3rem] font-light leading-[1.1] mb-5">
            Não encontrou <em className="italic text-gold-light">exatamente</em> o que procura?
          </h1>
          <p className="text-[0.95rem] sm:text-[1.05rem] font-light leading-[1.75] text-parchment/70 mb-9 max-w-[560px] mx-auto">
            Conte sua ideia. Nós ajudamos a organizar o pedido e encontramos artesãos que possam
            produzir — mesmo que você não saiba o nome da técnica ou do material.
          </p>

          <Link
            to="/projetos-sob-medida/criar"
            className="inline-flex items-center gap-2 bg-terra text-background px-8 py-4 font-body text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all"
          >
            <Sparkles className="w-4 h-4" /> Criar projeto sob medida
          </Link>

          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Link
              to="/projetos-sob-medida/criar"
              className="flex items-center gap-1.5 border border-parchment/25 px-4 py-2.5 font-body text-[0.68rem] tracking-[0.1em] uppercase text-parchment/70 hover:text-parchment hover:border-parchment/60 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" /> Escrever minha ideia
            </Link>
            <Link
              to="/projetos-sob-medida/criar"
              className="flex items-center gap-1.5 border border-parchment/25 px-4 py-2.5 font-body text-[0.68rem] tracking-[0.1em] uppercase text-parchment/70 hover:text-parchment hover:border-parchment/60 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" /> Enviar uma foto
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-9 py-12 sm:py-16">
        <div className="max-w-[1000px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-border border border-border">
          {PASSOS.map((p) => (
            <div key={p.n} className="bg-background p-6 sm:p-7">
              <div className="font-display text-[2rem] font-light text-terra leading-none mb-3">
                {p.n}
              </div>
              <div className="font-display text-[1.15rem] mb-2">{p.titulo}</div>
              <p className="text-[0.84rem] font-light leading-[1.7] text-muted-foreground">
                {p.texto}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-[1000px] mx-auto mt-10 border border-border bg-parchment p-6 sm:p-8">
          <div className="font-display text-[1.3rem] font-light mb-3">
            Serve para quem precisa de <em className="italic text-terra">uma peça só</em> ou de
            quinhentas
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[0.85rem] font-light text-muted-foreground">
            {[
              "Uma versão diferente de uma peça que você viu",
              "Uma peça que existe só na sua cabeça",
              "Brindes para a sua empresa",
              "Lembranças de casamento ou festa",
              "Decoração de uma pousada inteira",
              "Peças exclusivas para revenda na sua loja",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-terra">·</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MarketFooter />
    </>
  );
};

export default ProjetosSobMedidaPage;
