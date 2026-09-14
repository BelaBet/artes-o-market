import { useState } from "react";
import { Star, MapPin, Play, Users, Award, Sparkles, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IMAGES, formatPrice } from "@/lib/data";
import ShareMenu from "@/components/ShareMenu";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useExperiencias, type ExperienciaCard } from "@/hooks/useExperiencias";
import { useCart } from "@/contexts/CartContext";

// URL canônica de uma experiência — sem isso o compartilhamento
// aponta sempre para a página atual, não para a peça em questão.
const expUrl = (id: string) =>
  typeof window !== "undefined" ? `${window.location.origin}/experiencias#exp-${id}` : "";

type ExpType = "ao vivo" | "gravado" | "presencial" | "mentoria";

const KIND_INFO: Record<ExperienciaCard["kind"], { type: ExpType; badge: string; icon: JSX.Element }> = {
  live: { type: "ao vivo", badge: "Ao Vivo", icon: <Sparkles className="w-3 h-3" /> },
  recorded: { type: "gravado", badge: "Gravado", icon: <Play className="w-3 h-3" /> },
  in_person: { type: "presencial", badge: "Presencial", icon: <Users className="w-3 h-3" /> },
  mentorship: { type: "mentoria", badge: "Mentoria", icon: <Award className="w-3 h-3" /> },
};

function metaDaExperiencia(e: ExperienciaCard): string {
  return e.durationMinutes ? `${Math.round(e.durationMinutes / 60)}h` : "";
}

const CATEGORIES: { label: string; value: "todos" | ExpType; icon?: JSX.Element }[] = [
  { label: "Todas", value: "todos" },
  { label: "Ao Vivo", value: "ao vivo", icon: <Sparkles className="w-3 h-3" /> },
  { label: "Gravado", value: "gravado", icon: <Play className="w-3 h-3" /> },
  { label: "Presencial", value: "presencial", icon: <Users className="w-3 h-3" /> },
  { label: "Mentoria", value: "mentoria", icon: <Award className="w-3 h-3" /> },
];

const Stars = ({ rating }: { rating: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.round(rating) ? "fill-gold text-gold" : "text-border"}`}
      />
    ))}
    <span className="ml-1 text-[0.7rem] text-muted-foreground">{rating.toFixed(1)}</span>
  </span>
);

const Eyebrow = ({ children, color = "text-terra" }: { children: React.ReactNode; color?: string }) => (
  <div className={`flex items-center gap-2 text-[0.6rem] sm:text-[0.63rem] tracking-[0.18em] sm:tracking-[0.2em] uppercase mb-2 ${color}`}>
    <span className="inline-block w-6 h-px bg-current" />
    {children}
  </div>
);

const TypeBadge = ({ icon, children, light }: { icon: JSX.Element; children: React.ReactNode; light?: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-1 text-[0.54rem] tracking-[0.14em] uppercase font-semibold backdrop-blur ${
      light
        ? "bg-espresso/80 border border-gold/30 text-gold-light"
        : "bg-parchment text-foreground border border-border"
    }`}
  >
    {icon}
    {children}
  </span>
);

const FeaturedCard = ({ exp }: { exp: ExperienciaCard }) => {
  const info = KIND_INFO[exp.kind];
  const { addExperience } = useCart();
  return (
  <article id={`exp-${exp.id}`} className="grid grid-cols-1 md:grid-cols-2 bg-espresso text-parchment overflow-hidden">
    <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[380px] lg:min-h-[460px] overflow-hidden bg-parchment/10">
      {exp.img && <img src={exp.img} alt={exp.title} className="absolute inset-0 w-full h-full object-cover brightness-[0.78] saturate-[0.9]" />}
      <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[calc(100%-4rem)]">
        <TypeBadge icon={info.icon} light>{info.badge}</TypeBadge>
        <TypeBadge icon={<Sparkles className="w-3 h-3" />} light>Destaque</TypeBadge>
      </div>
      <div className="absolute top-3 right-3">
        <ShareMenu title={exp.title} url={expUrl(exp.id)} variant="dark" />
      </div>
    </div>
    <div className="p-6 sm:p-9 md:p-10 lg:p-14 flex flex-col justify-center">
      <Eyebrow color="text-gold-light">Experiência em destaque</Eyebrow>
      <h2 className="font-display font-light text-[1.55rem] sm:text-[1.9rem] md:text-[2rem] lg:text-[2.6rem] leading-[1.1] mb-4 break-words">
        {exp.title}
      </h2>
      {exp.description && (
        <p className="text-[0.8rem] sm:text-[0.85rem] font-light leading-[1.75] text-parchment/60 mb-6 sm:mb-7 max-w-[460px]">{exp.description}</p>
      )}

      <div className="flex items-center gap-3 mb-6 sm:mb-7">
        <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center font-display text-gold-light shrink-0">
          {exp.creator.charAt(0)}
        </div>
        <div className="min-w-0">
          <div className="text-[0.78rem] text-parchment truncate">{exp.creator}</div>
          <div className="text-[0.66rem] text-parchment/50 flex items-center gap-1 flex-wrap">
            {exp.location && <><MapPin className="w-3 h-3 shrink-0" /> {exp.location} · </>}
            {exp.reviews > 0 && <><Stars rating={exp.rating} /> ({exp.reviews})</>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-5 sm:pt-6 border-t border-parchment/15 flex-wrap">
        <div>
          <div className="font-display text-[1.5rem] sm:text-[1.8rem] text-gold-light">{formatPrice(exp.price)}</div>
          <div className="text-[0.62rem] tracking-[0.12em] uppercase text-parchment/40 mt-0.5">{metaDaExperiencia(exp)}</div>
        </div>
        <button
          onClick={() => addExperience(exp)}
          disabled={exp.soldOut}
          className="bg-terra text-background border-none px-5 sm:px-7 py-3 cursor-pointer font-body font-medium text-[0.68rem] sm:text-[0.71rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
        >
          {exp.soldOut ? "Esgotado" : "Garantir Vaga"}
        </button>
      </div>
    </div>
  </article>
  );
};

const ExperienceCard = ({ exp }: { exp: ExperienciaCard }) => {
  const info = KIND_INFO[exp.kind];
  const { addExperience } = useCart();
  return (
  <article id={`exp-${exp.id}`} className="bg-card border border-border flex flex-col group h-full">
    <div className="relative aspect-[4/3] overflow-hidden bg-parchment/40">
      {exp.img && (
        <img
          src={exp.img}
          alt={exp.title}
          className="absolute inset-0 w-full h-full object-cover brightness-[0.92] group-hover:scale-[1.04] group-hover:brightness-[0.82] transition-all duration-[600ms]"
        />
      )}
      <div className="absolute top-3 left-3 max-w-[calc(100%-3.5rem)]"><TypeBadge icon={info.icon} light>{info.badge}</TypeBadge></div>
      <div className="absolute top-3 right-3"><ShareMenu title={exp.title} url={expUrl(exp.id)} /></div>
      {metaDaExperiencia(exp) && (
        <div className="absolute bottom-3 left-3 right-3 inline-flex items-center gap-1 bg-background/85 backdrop-blur px-2 py-1 text-[0.58rem] tracking-[0.1em] uppercase text-foreground w-fit max-w-full truncate">
          <Clock className="w-3 h-3 shrink-0" /> <span className="truncate">{metaDaExperiencia(exp)}</span>
        </div>
      )}
    </div>
    <div className="p-4 sm:p-5 flex flex-col flex-1">
      <h3 className="font-display text-[1.05rem] sm:text-[1.15rem] leading-[1.2] mb-2 break-words">{exp.title}</h3>
      <div className="text-[0.7rem] text-muted-foreground mb-3 break-words">
        por <span className="text-foreground">{exp.creator}</span>{exp.location && ` · ${exp.location}`}
      </div>
      {exp.reviews > 0 && (
        <div className="mb-4"><Stars rating={exp.rating} /> <span className="text-[0.68rem] text-muted-foreground">({exp.reviews})</span></div>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-4 border-t border-border flex-wrap">
        <div className="font-display text-[1.15rem] sm:text-[1.25rem] text-terra">{formatPrice(exp.price)}</div>
        <button
          onClick={() => addExperience(exp)}
          disabled={exp.soldOut}
          className="bg-terra text-background px-3.5 sm:px-4 py-2 font-body text-[0.62rem] sm:text-[0.66rem] tracking-[0.14em] uppercase hover:bg-[hsl(18,56%,36%)] transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {exp.soldOut ? "Esgotado" : "Participar"}
        </button>
      </div>
    </div>
  </article>
  );
};

const ExperiencesPage = () => {
  const navigate = useNavigate();
  const onExplore = () => navigate("/catalogo");
  const [tab, setTab] = useState<"todos" | ExpType>("todos");
  const { experiencias, loading } = useExperiencias();
  usePageMeta(
    "Experiências",
    "Aulas, vivências e mentorias com artesãos brasileiros: torno, macramê, madeira e mais — ao vivo, gravadas ou presenciais.",
  );
  const featured = experiencias.find((e) => e.featured) ?? experiencias[0];
  const rest = experiencias.filter((e) => e.id !== featured?.id);
  const filtered = tab === "todos" ? rest : rest.filter((e) => KIND_INFO[e.kind].type === tab);

  if (!loading && experiencias.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-[420px] text-center">
          <div className="font-display text-[1.4rem] mb-2">Ainda não há experiências publicadas</div>
          <p className="text-[0.84rem] text-muted-foreground">Volte em breve — os artesãos estão preparando novas vivências.</p>
        </div>
      </div>
    );
  }
  if (loading || !featured) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-espresso text-parchment px-5 sm:px-9 py-14 sm:py-20 md:py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] bg-cover bg-center"
          style={{ backgroundImage: `url(${IMAGES.weave})` }}
        />
        <div className="max-w-[1320px] mx-auto relative z-10">
          <Eyebrow color="text-gold-light">Experiências Artesanais</Eyebrow>
          <h1 className="font-display font-light text-[2.2rem] sm:text-[3rem] md:text-[3.8rem] leading-[1.05] mb-5 max-w-[820px]">
            Aprenda com as <em className="italic text-gold-light">mãos que criam</em>
          </h1>
          <p className="text-[0.88rem] font-light leading-[1.85] text-parchment/55 max-w-[520px] mb-8">
            Aulas, vivências e mentorias direto com os artesãos por trás de cada peça —
            conhecimento de geração em geração, agora ao seu alcance.
          </p>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={onExplore}
              className="bg-terra text-background px-7 py-3 font-body font-medium text-[0.71rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all"
            >
              Explorar Experiências
            </button>
            <button className="bg-transparent text-parchment border border-parchment/30 px-7 py-3 font-body font-medium text-[0.71rem] tracking-[0.14em] uppercase hover:border-parchment transition-all">
              Quero Ensinar
            </button>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="px-4 md:px-9 py-12 sm:py-16">
        <div className="max-w-[1320px] mx-auto"><FeaturedCard exp={featured} /></div>
      </section>

      {/* Filters */}
      <section className="px-4 md:px-9">
        <div className="max-w-[1320px] mx-auto flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pb-5 border-b border-border">
          <div>
            <Eyebrow>Curadoria</Eyebrow>
            <h2 className="font-display font-normal text-[1.65rem] sm:text-[2.1rem] leading-[1.15]">
              Mais <em className="italic text-terra">experiências</em>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = tab === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setTab(c.value)}
                  className={`px-3.5 py-2 text-[0.62rem] tracking-[0.12em] uppercase flex items-center gap-1.5 border transition-colors ${
                    active
                      ? "bg-espresso text-cream border-espresso"
                      : "bg-transparent text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {c.icon}
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 md:px-9 py-10 sm:py-14">
        <div className="max-w-[1320px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exp) => <ExperienceCard key={exp.id} exp={exp} />)}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-[1320px] mx-auto h-px bg-gold/30 mx-4 md:mx-9" />

      {/* CTA */}
      <section className="bg-espresso text-parchment px-4 md:px-9 py-16 sm:py-20 text-center">
        <div className="max-w-[680px] mx-auto">
          <Sparkles className="w-6 h-6 text-gold-light mx-auto mb-4" />
          <h2 className="font-display font-light text-[2rem] sm:text-[2.6rem] leading-[1.1] mb-4">
            Você também sabe fazer algo <em className="italic text-gold-light">único?</em>
          </h2>
          <p className="text-[0.88rem] font-light leading-[1.85] text-parchment/55 mb-7">
            Transforme sua técnica em renda extra. Crie sua primeira experiência em poucos minutos.
          </p>
          <button className="bg-terra text-background px-8 py-3.5 font-body font-medium text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-90 hover:-translate-y-px transition-all">
            Quero Ensinar
          </button>
        </div>
      </section>
    </div>
  );
};

export default ExperiencesPage;
