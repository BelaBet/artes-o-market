import { IMAGES } from "@/lib/data";

const TextureBand = () => (
  <div className="h-[220px] sm:h-[280px] relative overflow-hidden">
    <img src={IMAGES.ceramic} alt="Workshop" className="w-full h-full object-cover brightness-50 saturate-[0.65]" />
    <div className="absolute inset-0 flex items-center justify-center text-center px-4">
      <h2 className="font-display font-light text-[1.55rem] sm:text-[2.2rem] md:text-[2.8rem] text-parchment tracking-[0.02em] sm:tracking-[0.03em] leading-[1.12]">
        "Cada peça conta<br /><em className="italic text-gold-light">uma história única"</em>
      </h2>
    </div>
  </div>
);

export default TextureBand;
