import { useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import EtapaEditor, { ETAPAS, type EtapaId } from "@/components/painel/EtapaEditor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMinhaLoja,
  useProgresso,
  useSalvarLoja,
  type EstadoSalvamento,
} from "@/hooks/useMinhaLoja";

/** Liga cada item do checklist (vindo do banco) à etapa editável correspondente. */
const ETAPA_DO_PROGRESSO: Record<string, EtapaId | undefined> = {
  nome: "sobre",
  cidade: "sobre",
  historia: "historia",
  materiais: "produz",
  tecnicas: "como",
  foto: "fotos",
  atelie: "fotos",
  vendas: "vende",
  peca: "oferece",
  experiencia: "oferece",
};

const IndicadorSalvamento = ({
  estado,
  onTentarNovamente,
}: {
  estado: EstadoSalvamento;
  onTentarNovamente: () => void;
}) => {
  if (estado === "ocioso") return null;

  if (estado === "erro") {
    return (
      <div className="flex items-center gap-2 text-[0.72rem] text-destructive">
        <span>Não conseguimos salvar agora. Sua resposta continua aqui.</span>
        <button
          onClick={onTentarNovamente}
          className="flex items-center gap-1 underline hover:no-underline"
        >
          <RefreshCw className="w-3 h-3" /> Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
      {estado === "salvando" ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
        </>
      ) : (
        <>
          <Check className="w-3 h-3 text-sage" /> Salvo
        </>
      )}
    </div>
  );
};

const MinhaLoja = () => {
  const { loja, loading } = useMinhaLoja();
  const { etapas, concluidas, total, percentual } = useProgresso(loja?.id);
  const { salvar, salvarAgora, estado, tentarNovamente } = useSalvarLoja(loja?.id);
  const [etapaAberta, setEtapaAberta] = useState<EtapaId | null>(null);
  const [pulou, setPulou] = useState(false);

  if (loading || !loja) {
    return (
      <div className="max-w-[720px]">
        <Skeleton className="h-[1.8rem] w-2/5 rounded-none mb-3" />
        <Skeleton className="h-[0.8rem] w-3/5 rounded-none mb-6" />
        <Skeleton className="h-[0.5rem] w-full rounded-none mb-8" />
        <Skeleton className="h-[12rem] w-full rounded-none" />
      </div>
    );
  }

  const primeiroAcesso =
    !pulou && !loja.onboarding_started_at && !loja.onboarding_skipped_at;

  const comecar = (etapa: EtapaId) => {
    setEtapaAberta(etapa);
    if (!loja.onboarding_started_at) {
      salvar({ onboarding_started_at: new Date().toISOString(), onboarding_step: etapa });
    } else {
      salvar({ onboarding_step: etapa });
    }
  };

  const sair = async () => {
    // Sai na hora: a pessoa continua usando a plataforma e volta ao
    // onboarding depois, pela própria "Minha loja".
    setEtapaAberta(null);
    setPulou(true);
    salvar({
      onboarding_skipped_at: loja.onboarding_skipped_at ?? new Date().toISOString(),
    });
    await salvarAgora();
  };


  // ------------------------------------------------------------------
  // Boas-vindas — só no primeiro acesso, e nunca bloqueando o painel
  // ------------------------------------------------------------------
  if (primeiroAcesso && !etapaAberta) {
    return (
      <div className="max-w-[620px]">
        <div className="border border-border bg-parchment p-6 sm:p-9">
          <h2 className="font-display text-[1.7rem] sm:text-[2rem] font-light leading-tight mb-4">
            Bem-vindo! 🎉
          </h2>
          <p className="text-[0.92rem] font-light leading-[1.75] mb-3">
            Queremos ajudar você a vender mais.
          </p>
          <p className="text-[0.92rem] font-light leading-[1.75] mb-3 text-muted-foreground">
            Vamos conhecer um pouco do seu trabalho para apresentar suas peças às pessoas
            certas e criar anúncios mais completos.
          </p>
          <p className="text-[0.86rem] font-light leading-[1.7] text-muted-foreground mb-7">
            Leva menos de 5 minutos e você pode alterar tudo depois.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => comecar("sobre")}
              className="bg-espresso text-parchment px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
            >
              Vamos começar
            </button>
            <button
              onClick={sair}
              className="border border-border px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Fazer isso depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Etapa aberta
  // ------------------------------------------------------------------
  if (etapaAberta) {
    return (
      <div className="max-w-[720px]">
        <div className="flex justify-end mb-3 min-h-[1.1rem]">
          <IndicadorSalvamento estado={estado} onTentarNovamente={tentarNovamente} />
        </div>
        <div className="border border-border bg-background p-5 sm:p-8">
          <EtapaEditor
            etapa={etapaAberta}
            loja={loja}
            salvar={salvar}
            onIrPara={comecar}
            onSair={sair}
          />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Visão geral
  // ------------------------------------------------------------------
  return (
    <div className="max-w-[720px]">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-1.5">
            Minha loja
          </div>
          <h2 className="font-display text-[1.5rem] sm:text-[1.85rem] font-light leading-tight">
            Sua loja está crescendo
          </h2>
        </div>
        <IndicadorSalvamento estado={estado} onTentarNovamente={tentarNovamente} />
      </div>

      <p className="text-[0.85rem] font-light leading-[1.7] text-muted-foreground mb-5">
        Quanto mais conhecermos seu trabalho, melhor poderemos apresentar suas peças aos
        compradores certos.
      </p>

      {/* Barra de progresso */}
      <div
        className="h-[6px] w-full bg-parchment border border-border mb-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progresso da loja"
      >
        <div
          className="h-full bg-terra transition-[width] duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>
      <div className="text-[0.72rem] text-muted-foreground mb-5">
        {concluidas} de {total} concluídos
      </div>

      {concluidas < total && (
        <button
          onClick={() =>
            comecar(
              ((loja.onboarding_step as EtapaId | null) ??
                (etapas.find((e) => !e.concluida)?.etapa as EtapaId) ??
                "sobre") as EtapaId,
            )
          }
          className="bg-espresso text-parchment px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all mb-7"
        >
          Continuar de onde parei
        </button>
      )}


      {/* Checklist */}
      <div className="border border-border divide-y divide-border mb-7">
        {etapas.map((e) => {
          const destino = ETAPA_DO_PROGRESSO[e.etapa];
          const Elemento = destino ? "button" : "div";
          return (
            <Elemento
              key={e.etapa}
              {...(destino
                ? {
                    type: "button" as const,
                    onClick: () => comecar(destino),
                    className:
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-parchment transition-colors",
                  }
                : { className: "w-full flex items-center gap-3 px-4 py-3" })}
            >
              <span
                aria-hidden
                className={`w-[18px] h-[18px] shrink-0 border flex items-center justify-center ${
                  e.concluida ? "bg-sage border-sage" : "border-border"
                }`}
              >
                {e.concluida && <Check className="w-3 h-3 text-background" />}
              </span>
              <span
                className={`font-body text-[0.82rem] ${
                  e.concluida ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {e.rotulo}
              </span>
              <span className="sr-only">{e.concluida ? "concluído" : "ainda não feito"}</span>
              {destino && <span className="ml-auto text-muted-foreground">→</span>}
            </Elemento>
          );
        })}
      </div>


      {/* Seções */}
      <div className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-3">
        Editar informações
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ETAPAS.map((e) => (
          <button
            key={e.id}
            onClick={() => comecar(e.id)}
            className="border border-border px-4 py-3.5 text-left font-body text-[0.8rem] hover:border-foreground hover:bg-parchment transition-colors flex items-center justify-between gap-2"
          >
            {e.titulo}
            <span className="text-muted-foreground">→</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MinhaLoja;
