import { useEffect, useRef, useState } from "react";
import { Check, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Mesmas classes usadas no resto do painel — nada de estilo paralelo.
const campoBase =
  "w-full border border-border bg-background px-3 py-2.5 font-body text-[0.85rem] outline-none focus:border-terra transition-colors";
const rotuloBase =
  "block font-body text-[0.62rem] tracking-[0.14em] uppercase text-muted-foreground mb-2";

const chip = (ativo: boolean) =>
  `shrink-0 whitespace-nowrap font-body text-[0.68rem] sm:text-[0.7rem] tracking-[0.08em] px-3.5 py-2.5 border transition-colors text-left ${
    ativo
      ? "bg-foreground text-background border-foreground"
      : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground"
  }`;

interface CampoProps {
  rotulo: string;
  ajuda?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export const Campo = ({ rotulo, ajuda, children, htmlFor }: CampoProps) => (
  <div className="mb-6">
    <label className={rotuloBase} htmlFor={htmlFor}>
      {rotulo}
    </label>
    {children}
    {ajuda && (
      <p className="text-[0.74rem] text-muted-foreground font-light mt-2 leading-snug">{ajuda}</p>
    )}
  </div>
);

// ---------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------
interface TextoProps {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ajuda?: string;
  linhas?: number;
}

export const CampoTexto = ({ id, rotulo, valor, onChange, placeholder, ajuda }: TextoProps) => (
  <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
    <input
      id={id}
      type="text"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={campoBase}
    />
  </Campo>
);

export const CampoTextoLongo = ({
  id, rotulo, valor, onChange, placeholder, ajuda, linhas = 7,
}: TextoProps) => (
  <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
    <textarea
      id={id}
      rows={linhas}
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${campoBase} resize-y leading-[1.7]`}
    />
  </Campo>
);

interface NumeroProps {
  id: string;
  rotulo: string;
  valor: number | null;
  onChange: (v: number | null) => void;
  sufixo?: string;
  ajuda?: string;
  min?: number;
  max?: number;
}

export const CampoNumero = ({
  id, rotulo, valor, onChange, sufixo, ajuda, min = 0, max = 9999,
}: NumeroProps) => (
  <Campo rotulo={rotulo} ajuda={ajuda} htmlFor={id}>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className={`${campoBase} max-w-[140px]`}
      />
      {sufixo && (
        <span className="font-body text-[0.78rem] text-muted-foreground">{sufixo}</span>
      )}
    </div>
  </Campo>
);

// ---------------------------------------------------------------------
// Seleção múltipla em cartões
// ---------------------------------------------------------------------
export interface Opcao {
  id: string;
  name: string;
}

interface SelecaoProps {
  rotulo: string;
  ajuda?: string;
  opcoes: Opcao[];
  selecionados: string[];
  onAlternar: (id: string, selecionado: boolean) => void;
  /** limite de itens; ao atingir, os demais ficam desabilitados */
  maximo?: number;
  carregando?: boolean;
}

export const CampoSelecao = ({
  rotulo, ajuda, opcoes, selecionados, onAlternar, maximo, carregando,
}: SelecaoProps) => {
  const noLimite = maximo != null && selecionados.length >= maximo;

  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      {carregando ? (
        <div className="text-[0.75rem] text-muted-foreground py-2">Carregando opções…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label={rotulo}>
          {opcoes.map((o) => {
            const ativo = selecionados.includes(o.id);
            const bloqueado = !ativo && noLimite;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={ativo}
                disabled={bloqueado}
                onClick={() => onAlternar(o.id, !ativo)}
                className={`${chip(ativo)} flex items-center justify-between gap-2 ${
                  bloqueado ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                <span>{o.name}</span>
                {ativo && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {maximo != null && (
        <p className="text-[0.72rem] text-muted-foreground mt-2">
          {selecionados.length} de {maximo} selecionados
        </p>
      )}
    </Campo>
  );
};

// ---------------------------------------------------------------------
// Lista de sim/não
// ---------------------------------------------------------------------
export interface Alternativa {
  chave: string;
  rotulo: string;
}

interface AlternativasProps {
  rotulo: string;
  ajuda?: string;
  alternativas: Alternativa[];
  valores: Record<string, boolean>;
  onAlternar: (chave: string, valor: boolean) => void;
}

export const CampoAlternativas = ({
  rotulo, ajuda, alternativas, valores, onAlternar,
}: AlternativasProps) => (
  <Campo rotulo={rotulo} ajuda={ajuda}>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="group" aria-label={rotulo}>
      {alternativas.map((a) => {
        const ativo = !!valores[a.chave];
        return (
          <button
            key={a.chave}
            type="button"
            aria-pressed={ativo}
            onClick={() => onAlternar(a.chave, !ativo)}
            className={`${chip(ativo)} flex items-center justify-between gap-2`}
          >
            <span>{a.rotulo}</span>
            {ativo && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        );
      })}
    </div>
  </Campo>
);

// ---------------------------------------------------------------------
// Foto
//
// O caminho SEMPRE começa com o id da loja: é o que a policy do Storage
// usa para isolar uma loja da outra.
// ---------------------------------------------------------------------
interface FotoProps {
  rotulo: string;
  ajuda?: string;
  artisanId: string;
  pasta: string;
  valor: string | null;
  onChange: (caminho: string) => void;
}

export const CampoFoto = ({ rotulo, ajuda, artisanId, pasta, valor, onChange }: FotoProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!valor) {
      setPreview(null);
      return;
    }
    if (/^https?:\/\//.test(valor)) {
      setPreview(valor);
      return;
    }
    const { data } = supabase.storage.from("lojas").getPublicUrl(valor);
    setPreview(data.publicUrl);
  }, [valor]);

  const enviar = async (arquivo: File) => {
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("A foto passou de 5 MB. Tente uma imagem menor.");
      return;
    }

    setEnviando(true);
    const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const caminho = `${artisanId}/${pasta}-${Date.now()}.${extensao}`;

    const { error } = await supabase.storage
      .from("lojas")
      .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

    setEnviando(false);

    if (error) {
      toast.error("Não conseguimos enviar a foto agora. Tente de novo.");
      return;
    }

    onChange(caminho);
    toast.success("Foto adicionada");
  };

  return (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <div className="flex items-center gap-4">
        <div className="w-[88px] h-[88px] shrink-0 border border-border bg-parchment overflow-hidden flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <Camera className="w-6 h-6 text-muted-foreground opacity-40" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={enviando}
              className="border border-foreground px-4 py-2 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {enviando ? "Enviando…" : "Enviar do dispositivo"}
            </button>

            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={enviando}
              className="border border-border px-4 py-2 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors disabled:opacity-50"
            >
              Tirar foto
            </button>
          </div>

          {preview && !enviando && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="self-start font-body text-[0.66rem] tracking-[0.1em] uppercase text-muted-foreground underline hover:text-destructive transition-colors"
            >
              Remover
            </button>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void enviar(arquivo);
              e.target.value = "";
            }}
          />

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) void enviar(arquivo);
              e.target.value = "";
            }}
          />
        </div>

      </div>
    </Campo>
  );
};
