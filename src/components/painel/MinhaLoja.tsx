import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BlocoEditor, { EscolhaFormasDeTrabalhar } from "@/components/painel/BlocoEditor";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BLOCOS,
  ETAPAS_ONBOARDING,
  etapaParaRetomar,
  etapaRespondida,
  etapasRespondidas,
  type BlocoId,
  type EtapaOnboarding,
} from "@/lib/painel/blocos";
import {
  useMinhaLoja,
  useProgresso,
  useSalvarLoja,
  type EstadoSalvamento,
} from "@/hooks/useMinhaLoja";

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
        <button onClick={onTentarNovamente} className="flex items-center gap-1 underline">
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

  const [modo, setModo] = useState<"visao" | "onboarding" | "bloco" | "final">("visao");
  const [etapa, setEtapa] = useState<EtapaOnboarding>("sobre");
  const [bloco, setBloco] = useState<BlocoId>("sobre");

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
    !loja.onboarding_completed_at && !loja.onboarding_started_at && !loja.onboarding_skipped_at;

  const indice = ETAPAS_ONBOARDING.findIndex((e) => e.id === etapa);

  const respondida = (etapa: EtapaOnboarding) => etapaRespondida(etapa, etapas);

  const comecarOnboarding = (etapaEscolhida?: EtapaOnboarding) => {
    const inicio = etapaEscolhida ?? etapaParaRetomar(loja.onboarding_step, etapas);

    setEtapa(inicio);
    setModo("onboarding");
    salvar({
      onboarding_started_at: loja.onboarding_started_at ?? new Date().toISOString(),
      onboarding_step: inicio,
    });
  };

  const adiar = async () => {
    setModo("visao");
    // Guarda a etapa em que a pessoa estava: é para cá que ela volta.
    salvar({
      onboarding_skipped_at: loja.onboarding_skipped_at ?? new Date().toISOString(),
      onboarding_step: etapa,
    });
    await salvarAgora();
  };

  const concluir = async () => {
    await salvarAgora();
    // A data de conclusão é gravada pelo banco, não pelo navegador.
    await supabase.rpc("concluir_onboarding");
    setModo("final");
  };

  // ------------------------------------------------------------------
  // Boas-vindas
  // ------------------------------------------------------------------
  if (primeiroAcesso && modo === "visao") {
    return (
      <div className="max-w-[620px]">
        <div className="border border-border bg-parchment p-6 sm:p-9">
          <h2 className="font-display text-[1.7rem] sm:text-[2rem] font-light leading-tight mb-4">
            Bem-vindo! 🎉
          </h2>
          <p className="text-[0.92rem] font-light leading-[1.75] mb-3">
            Sua loja já existe — você pode começar a usar o painel agora mesmo.
          </p>
          <p className="text-[0.9rem] font-light leading-[1.75] text-muted-foreground mb-7">
            Se quiser, responda quatro perguntas rápidas para a gente conhecer seu trabalho e
            ajudar suas peças a chegarem às pessoas certas. Leva uns 2 minutos e dá para
            alterar tudo depois.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => comecarOnboarding()}
              className="bg-espresso text-parchment px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
            >
              Vamos começar
            </button>
            <button
              onClick={adiar}
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
  // Onboarding curto
  // ------------------------------------------------------------------
  if (modo === "onboarding") {
    const atual = ETAPAS_ONBOARDING[indice];
    const ultima = indice === ETAPAS_ONBOARDING.length - 1;

    return (
      <div className="max-w-[720px]">
        <div className="flex justify-end mb-3 min-h-[1.1rem]">
          <IndicadorSalvamento estado={estado} onTentarNovamente={tentarNovamente} />
        </div>

        <div className="border border-border bg-background p-5 sm:p-8">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-terra">
              Etapa {indice + 1} de {ETAPAS_ONBOARDING.length}
            </span>
            <button
              onClick={adiar}
              className="font-body text-[0.66rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors"
            >
              Fazer isso depois
            </button>
          </div>

          <h3 className="font-display text-[1.5rem] sm:text-[1.75rem] font-light mb-2">
            {atual.titulo}
          </h3>

          {respondida(atual.id) && (
            <p className="text-[0.76rem] text-muted-foreground mb-4">
              Você já respondeu esta etapa — pode revisar ou seguir em frente.
            </p>
          )}

          {/* Barra fina de progresso do onboarding */}
          <div className="h-[3px] w-full bg-parchment mb-7 overflow-hidden">
            <div
              className="h-full bg-terra transition-[width] duration-500"
              style={{ width: `${((indice + 1) / ETAPAS_ONBOARDING.length) * 100}%` }}
            />
          </div>

          {etapa === "vender" ? (
            <EscolhaFormasDeTrabalhar lojaId={loja.id} />
          ) : (
            <BlocoEditor bloco={etapa as BlocoId} loja={loja} salvar={salvar} />
          )}

          <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-border">
            <button
              onClick={() => indice > 0 && setEtapa(ETAPAS_ONBOARDING[indice - 1].id)}
              disabled={indice === 0}
              className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Voltar
            </button>

            {ultima ? (
              <button
                onClick={concluir}
                className="bg-terra text-background px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all"
              >
                Concluir
              </button>
            ) : (
              <button
                onClick={() => {
                  const proxima = ETAPAS_ONBOARDING[indice + 1].id;
                  setEtapa(proxima);
                  salvar({ onboarding_step: proxima });
                }}
                className="flex items-center gap-1.5 bg-espresso text-parchment px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
              >
                Continuar <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Fim do onboarding
  // ------------------------------------------------------------------
  if (modo === "final") {
    return (
      <div className="max-w-[620px]">
        <div className="border border-border bg-parchment p-6 sm:p-9 text-center">
          <h2 className="font-display text-[1.7rem] sm:text-[2rem] font-light leading-tight mb-3">
            Tudo pronto! 🎉
          </h2>
          <p className="text-[0.92rem] font-light leading-[1.75] text-muted-foreground mb-7">
            Agora podemos ajudar suas peças a chegar a mais compradores. Você pode completar o
            resto da sua loja quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
            <button
              onClick={() => {
                // Sai de Minha Loja e cai na aba de peças.
                window.dispatchEvent(new CustomEvent("painel:abrir-aba", { detail: "pecas" }));
              }}
              className="bg-terra text-background px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all"
            >
              Cadastrar minha primeira peça
            </button>
            <button
              onClick={() => setModo("visao")}
              className="border border-border px-6 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Ir para minha loja
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Bloco em edição
  // ------------------------------------------------------------------
  if (modo === "bloco") {
    const atual = BLOCOS.find((b) => b.id === bloco);

    return (
      <div className="max-w-[720px]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={() => setModo("visao")}
            className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Minha loja
          </button>
          <IndicadorSalvamento estado={estado} onTentarNovamente={tentarNovamente} />
        </div>

        <div className="border border-border bg-background p-5 sm:p-8">
          <h3 className="font-display text-[1.5rem] sm:text-[1.75rem] font-light mb-6">
            {atual?.titulo}
          </h3>

          {bloco === "vender" ? (
            <>
              <EscolhaFormasDeTrabalhar lojaId={loja.id} />
              <BlocoEditor bloco="vender" loja={loja} salvar={salvar} />
            </>
          ) : (
            <BlocoEditor bloco={bloco} loja={loja} salvar={salvar} />
          )}

          <div className="pt-4 mt-2 border-t border-border">
            <button
              onClick={async () => {
                await salvarAgora();
                setModo("visao");
              }}
              className="bg-espresso text-parchment px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
            >
              Pronto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Visão geral
  // ------------------------------------------------------------------
  const faltaHistoria = !loja.bio || loja.bio.length < 40;

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
      <div className="text-[0.72rem] text-muted-foreground mb-6">
        {concluidas} de {total} concluídos
      </div>

      {/* Lembrete leve, quando a história ficou para depois */}
      {faltaHistoria && (
        <div className="border border-border bg-parchment px-4 py-3.5 mb-6 flex items-start gap-3">
          <div className="min-w-0">
            <p className="text-[0.84rem] font-light leading-[1.6] mb-2">
              Contar sua história ajuda compradores a conhecerem quem está por trás das peças.
            </p>
            <button
              onClick={() => {
                setBloco("historia");
                setModo("bloco");
              }}
              className="font-body text-[0.66rem] tracking-[0.12em] uppercase text-terra hover:underline"
            >
              Contar minha história
            </button>
          </div>
        </div>
      )}

      {/* Onboarding ainda não concluído: convite discreto, nunca bloqueio */}
      {!loja.onboarding_completed_at &&
        (() => {
          const retomar = etapaParaRetomar(loja.onboarding_step, etapas);
          const indiceRetomar = ETAPAS_ONBOARDING.findIndex((e) => e.id === retomar);
          const respondidas = etapasRespondidas(etapas);
          const comecou = respondidas > 0 || !!loja.onboarding_started_at;

          return (
            <div className="border border-terra/50 px-4 py-4 mb-6">
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <span className="font-body text-[0.86rem]">
                  {comecou
                    ? "Continuar de onde parei"
                    : "Responder 4 perguntas rápidas sobre seu trabalho"}
                </span>
                {comecou && (
                  <span className="shrink-0 text-[0.68rem] text-muted-foreground">
                    {respondidas} de {ETAPAS_ONBOARDING.length}
                  </span>
                )}
              </div>

              <p className="text-[0.78rem] text-muted-foreground font-light leading-snug mb-3">
                {comecou
                  ? `Você para na etapa ${indiceRetomar + 1}: ${
                      ETAPAS_ONBOARDING[indiceRetomar].titulo
                    }. O que você já respondeu está guardado.`
                  : "Leva uns 2 minutos e dá para alterar tudo depois."}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => comecarOnboarding()}
                  className="bg-espresso text-parchment px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:brightness-125 transition-all"
                >
                  {comecou ? "Continuar" : "Começar"}
                </button>

                {comecou && respondidas > 0 && (
                  <button
                    onClick={() => comecarOnboarding("sobre")}
                    className="border border-border px-4 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  >
                    Revisar desde o início
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      <div className="border border-border divide-y divide-border mb-7">
        {etapas.map((e) => (
          <div key={e.etapa} className="flex items-center gap-3 px-4 py-3">
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
          </div>
        ))}
      </div>

      <div className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mb-3">
        Completar minha loja
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BLOCOS.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setBloco(b.id);
              setModo("bloco");
            }}
            className="border border-border px-4 py-3.5 text-left hover:border-foreground hover:bg-parchment transition-colors"
          >
            <div className="font-body text-[0.82rem] mb-0.5">{b.titulo}</div>
            <div className="text-[0.72rem] text-muted-foreground font-light">{b.resumo}</div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-[0.78rem] text-muted-foreground font-light">
        Recebe encomendas?{" "}
        <Link to="/painel" className="text-terra hover:underline">
          Veja os pedidos na aba Encomendas
        </Link>
        .
      </div>
    </div>
  );
};

export default MinhaLoja;
