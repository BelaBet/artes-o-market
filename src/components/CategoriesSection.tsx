import { Link } from "react-router-dom";
import ImagemComPlaceholder from "@/components/ImagemComPlaceholder";
import { IMAGES, CATEGORIES } from "@/lib/data";

// As fotos das categorias são decorativas e continuam empacotadas; o
// slug é o que importa e vem alinhado com public.categories.
const SLUG_POR_IMAGEM: Record<string, string> = {
  stone: "pedra-sabao",
  weave: "macrame",
  wood: "madeira",
  straw1: "palha",
  pottery: "ceramica",
  ceramic: "barro",
  basket: "cestos",
  straw2: "tecidos",
};

const CategoriesSection = () => (
  <section className="py-12 sm:py-16 px-4 md:px-9">
    <div className="max-w-[1320px] mx-auto">
      <div className="text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase text-terra mb-2">Categorias</div>
      <h2 className="font-display font-normal text-[1.65rem] sm:text-[2.1rem] leading-[1.15]">
        Explore por <em className="italic text-terra">técnica</em>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border border-border mt-8 sm:mt-10">
        {CATEGORIES.map((cat, i) => (
          <Link
            key={i}
            to={`/catalogo?categoria=${SLUG_POR_IMAGEM[cat.img] ?? ""}`}
            className="flex flex-col items-center cursor-pointer overflow-hidden relative aspect-[1] sm:aspect-[0.78] border-r border-b border-border group"
          >
            <ImagemComPlaceholder
              src={IMAGES[cat.img]}
              alt={cat.name}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.6] saturate-[0.7] group-hover:brightness-50 group-hover:scale-[1.06] transition-all duration-500"
            tintKey={cat.img} />
            <div className="relative z-[1] flex flex-col items-center justify-end h-full pb-3 gap-1">
              <div className="text-[0.58rem] tracking-[0.12em] uppercase font-semibold text-background text-center drop-shadow-lg px-2">
                {cat.name}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-terra scale-x-0 group-hover:scale-x-100 transition-transform duration-300 z-[2]" />
          </Link>
        ))}
      </div>
    </div>
  </section>
);

export default CategoriesSection;
