import { useState } from "react";
import { cn } from "@/lib/utils";
import { IMAGE_TINTS } from "@/lib/data";

interface ImagemComPlaceholderProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** cor média da foto, vinda do banco */
  tint?: string | null;
  /** alternativa: chave em IMAGE_TINTS, para as telas ainda com dados locais */
  tintKey?: string;
  /** true para a primeira dobra: carrega com prioridade em vez de lazy */
  prioridade?: boolean;
}

/**
 * Imagem com placeholder colorido e fade-in.
 * O container reserva o espaço (aspect-ratio no pai), então não há
 * layout shift — o card já nasce com a forma final.
 */
const ImagemComPlaceholder = ({
  tint: tintDireto,
  tintKey,
  prioridade = false,
  className,
  onLoad,
  ...props
}: ImagemComPlaceholderProps) => {
  const [carregada, setCarregada] = useState(false);
  const tint = tintDireto ?? (tintKey ? IMAGE_TINTS[tintKey] : undefined);

  return (
    <>
      {/* Placeholder: cor média da foto + pulso sutil enquanto não chega */}
      {!carregada && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse motion-reduce:animate-none"
          style={{ backgroundColor: tint ?? "hsl(var(--parchment))" }}
        />
      )}
      <img
        {...props}
        loading={prioridade ? "eager" : "lazy"}
        decoding="async"
        // React 18 nao reconhece o camelCase fetchPriority; o atributo
        // precisa ir em minusculas para nao virar warning no console.
        {...({ fetchpriority: prioridade ? "high" : "auto" } as Record<string, string>)}
        onLoad={(e) => {
          setCarregada(true);
          onLoad?.(e);
        }}
        onError={() => setCarregada(true)}
        className={cn(
          className,
          "transition-opacity duration-500",
          carregada ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
};

export default ImagemComPlaceholder;
