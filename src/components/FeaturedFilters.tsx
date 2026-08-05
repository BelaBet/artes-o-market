import { CATEGORIES, BADGE_MAP } from "@/lib/data";

export type StyleKey = keyof typeof BADGE_MAP | "todos";

interface FeaturedFiltersProps {
  category: string;
  style: StyleKey;
  onCategoryChange: (c: string) => void;
  onStyleChange: (s: StyleKey) => void;
  resultCount: number;
  onClear: () => void;
}

const chip = (active: boolean) =>
  `shrink-0 whitespace-nowrap font-body text-[0.6rem] sm:text-[0.64rem] tracking-[0.12em] uppercase px-3 py-2 sm:py-1.5 border transition-colors ${
    active
      ? "bg-foreground text-background border-foreground"
      : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground"
  }`;

const FeaturedFilters = ({
  category,
  style,
  onCategoryChange,
  onStyleChange,
  resultCount,
  onClear,
}: FeaturedFiltersProps) => {
  const styles: { key: StyleKey; label: string }[] = [
    { key: "todos", label: "Todos" },
    ...Object.entries(BADGE_MAP).map(([key, v]) => ({ key: key as StyleKey, label: v.label })),
  ];
  const isFiltered = category !== "todas" || style !== "todos";

  return (
    <div className="mb-5 sm:mb-7 flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-[0.55rem] sm:text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground">
          Categoria
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-none">
          <button className={chip(category === "todas")} onClick={() => onCategoryChange("todas")}>
            Todas
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.img} className={chip(category === c.img)} onClick={() => onCategoryChange(c.img)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[0.55rem] sm:text-[0.58rem] tracking-[0.18em] uppercase text-muted-foreground">
          Estilo
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-none">
          {styles.map((s) => (
            <button key={s.key} className={chip(style === s.key)} onClick={() => onStyleChange(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-[0.62rem] sm:text-[0.66rem] text-muted-foreground">
          {resultCount} {resultCount === 1 ? "peça encontrada" : "peças encontradas"}
        </span>
        {isFiltered && (
          <button
            onClick={onClear}
            className="font-body text-[0.6rem] sm:text-[0.64rem] tracking-[0.12em] uppercase text-terra hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
};

export default FeaturedFilters;
