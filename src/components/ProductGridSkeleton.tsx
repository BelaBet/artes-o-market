import { Skeleton } from "@/components/ui/skeleton";

/**
 * Esqueleto da grade de produtos. A estrutura espelha exatamente o
 * ProductGrid (mesma grid, mesmas proporções, mesmos espaçamentos) para
 * que a troca skeleton → conteúdo não empurre nada na tela.
 */
const ProductGridSkeleton = ({ quantidade = 8 }: { quantidade?: number }) => (
  <div
    className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-px bg-border border border-border"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span className="sr-only">Carregando peças…</span>
    {Array.from({ length: quantidade }).map((_, i) => (
      <div key={i} className="bg-background" aria-hidden>
        <Skeleton className="aspect-square rounded-none bg-parchment" />
        <div className="p-2.5 sm:p-3.5 pb-3 sm:pb-4">
          <Skeleton className="h-[0.95rem] w-4/5 rounded-none mb-2" />
          <Skeleton className="h-[0.6rem] w-3/5 rounded-none mb-3 sm:mb-4" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full">
              <Skeleton className="h-[0.6rem] w-[4.5rem] rounded-none mb-1.5" />
              <Skeleton className="h-[1.1rem] w-[5.5rem] rounded-none" />
            </div>
            <Skeleton className="h-[2rem] sm:h-[1.6rem] w-full sm:w-[5.5rem] rounded-none shrink-0" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default ProductGridSkeleton;
