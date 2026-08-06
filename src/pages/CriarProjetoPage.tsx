import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Loader2, Paperclip, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { usePeca } from "@/hooks/useCatalogo";
import {
  FAIXAS_ORCAMENTO,
  FAIXAS_QUANTIDADE,
  TIPOS,
  useAnexos,
  useEnviarEncomenda,
  useRascunho,
  useSalvarEncomenda,
  type EstadoSalvamento,
  type TipoEncomenda,
} from "@/hooks/useEncomendas";

const ETAPAS = ["tipo", "ideia", "referencias", "detalhes", "quantidade", "prazo", "local", "valor", "revisao"] as const;
type Etapa = (typeof ETAPAS)[number];

const campo =
  "w-full border border-border bg-background px-3 py-2.5 font-body text-[0.85rem] outline-none focus:border-terra transition-colors";
const rotulo = "block font-body text-[0.62rem] tracking-[0.14em] uppercase text-muted-foreground mb-2";

const cartao = (ativo: boolean) =>
  `w-full text-left border px-4 py-3.5 transition-colors ${
    ativo
      ? "border-foreground bg-parchment"
      : "border-border hover:border-foreground hover:bg-parchment/50"
  }`;

const Salvamento = ({ estado, onTentar }: { estado: EstadoSalvamento; onTentar: () => void }) => {
  if (estado === "ocioso") return null;
  if (estado === "erro")
    return (
      <span className="flex items-center gap-2 text-[0.72rem] text-destructive">
        Não conseguimos salvar. Sua resposta continua aqui.
        <button onClick={onTentar} className="flex items-center gap-1 underline">
          <RefreshCw className="w-3 h-3" /> Tentar de novo
        </button>
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-[0.72rem] text-muted-foreground">
      {estado === "salvando" ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
        </>
      ) : (
        <>
          <Check className="w-3 h-3 text-sage" /> Salvo
        </>
      )}
    </span>
  );
};

const CriarProjetoPage = () => {
  const navigate = useNavigate();
  const { user, loading: carregandoSessao } = useAuth();
  const [params] = useSearchParams();

  usePageMeta(
    "Criar projeto sob medida",
    "Conte sua ideia e encontre artesãos brasileiros que podem transformá-la em realidade.",
  );

  const { rascunho, loading, criar } = useRascunho(params.get("id") ?? undefined);
  // Veio da página de uma peça: já entra como personalização daquela peça.
  const slugOrigem = params.get("peca") ?? undefined;
  const { peca: pecaOrigem } = usePeca(slugOrigem);
  const { salvar, salvarAgora, estado, tentarNovamente } = useSalvarEncomenda(rascunho?.id);
  const { anexos, enviar: enviarAnexo, enviando } = useAnexos(rascunho?.id);
  const enviarEncomenda = useEnviarEncomenda();

  const [etapa, setEtapa] = useState<Etapa>("tipo");
  const [local, setLocal] = useState<Record<string, unknown>>({});

  // Retoma de onde parou: se já existe rascunho com tipo escolhido,
  // não faz sentido começar pela primeira pergunta de novo.
  useEffect(() => {
    if (rascunho && etapa === "tipo" && rascunho.description) setEtapa("ideia");
  }, [rascunho]); // eslint-disable-line react-hooks/exhaustive-deps

  // Abertura a partir de uma peça: cria o rascunho já apontando para ela
  // e pula a pergunta do tipo, que a origem já respondeu.
  const [origemAplicada, setOrigemAplicada] = useState(false);
  useEffect(() => {
    if (!pecaOrigem || origemAplicada || loading) return;
    setOrigemAplicada(true);

    (async () => {
      const alvo = rascunho ?? (await criar("personalizar"));
      const campos = {
        request_type: "personalizar" as TipoEncomenda,
        source_product_id: pecaOrigem.id,
        selected_artisan_id: pecaOrigem.artisan.id,
        distribution_mode: "artesao_especifico" as const,
        title: `Versão personalizada — ${pecaOrigem.title}`,
      };
      setLocal((l) => ({ ...l, ...campos }));
      if (alvo) salvar(campos as never);
      setEtapa("ideia");
    })();
  }, [pecaOrigem, rascunho, loading, origemAplicada]); // eslint-disable-line react-hooks/exhaustive-deps

  const valor = <K extends keyof NonNullable<typeof rascunho>>(campoNome: K) =>
    (local[campoNome as string] !== undefined
      ? local[campoNome as string]
      : rascunho?.[campoNome]) as NonNullable<typeof rascunho>[K];

  const mudar = (campos: Record<string, unknown>) => {
    setLocal((l) => ({ ...l, ...campos }));
    salvar(campos as never);
  };

  const indice = ETAPAS.indexOf(etapa);
  const proxima = () => setEtapa(ETAPAS[Math.min(indice + 1, ETAPAS.length - 1)]);
  const anterior = () => setEtapa(ETAPAS[Math.max(indice - 1, 0)]);

  const podeEnviar = useMemo(
    () => (((valor("description") as string) ?? "").trim().length >= 10),
    [rascunho, local], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (carregandoSessao) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-10">
        <Skeleton className="h-[2rem] w-2/3 rounded-none mb-4" />
        <Skeleton className="h-[10rem] w-full rounded-none" />
      </div>
    );
  }

  // Entrar é requisito para criar projeto — mas explicado, não imposto.
  if (!user) {
    return (
      <div className="max-w-[560px] mx-auto px-4 py-14 text-center">
        <h1 className="font-display text-[1.8rem] font-light mb-3">Quase lá</h1>
        <p className="text-[0.9rem] font-light leading-[1.75] text-muted-foreground mb-7">
          Para criar um projeto sob medida você precisa entrar. É com a sua conta que os artesãos
          respondem e você acompanha as propostas.
        </p>
        <button
          onClick={() => navigate("/entrar", { state: { from: "/projetos-sob-medida/criar" } })}
          className="bg-espresso text-parchment px-7 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
        >
          Entrar ou criar conta
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-10">
        <Skeleton className="h-[1.6rem] w-1/2 rounded-none mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[3.4rem] w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Etapa 1: tipo — cria o rascunho no banco já na escolha
  // ------------------------------------------------------------------
  if (!rascunho || etapa === "tipo") {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-10 sm:py-14">
        <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-2">
          Projetos sob medida
        </div>
        <h1 className="font-display text-[1.7rem] sm:text-[2.1rem] font-light leading-tight mb-2">
          O que você precisa?
        </h1>
        <p className="text-[0.86rem] font-light text-muted-foreground mb-7">
          Escolha o que mais se aproxima. Você poderá explicar em detalhes na próxima tela.
        </p>

        <div className="space-y-2">
          {TIPOS.map((t) => (
            <button
              key={t.tipo}
              onClick={async () => {
                if (!rascunho) await criar(t.tipo as TipoEncomenda);
                else mudar({ request_type: t.tipo });
                setEtapa("ideia");
              }}
              className={cartao(rascunho?.request_type === t.tipo)}
            >
              <div className="font-body text-[0.86rem] mb-0.5">{t.rotulo}</div>
              <div className="text-[0.74rem] text-muted-foreground font-light">{t.descricao}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[640px] mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-terra">
          Passo {indice} de {ETAPAS.length - 1}
        </span>
        <Salvamento estado={estado} onTentar={tentarNovamente} />
      </div>

      {/* ---------------------------------------------------------- */}
      {etapa === "ideia" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            {pecaOrigem ? "O que você quer mudar nesta peça?" : "Conte o que você gostaria de criar"}
          </h1>

          {pecaOrigem && (
            <div className="border border-border bg-parchment px-4 py-3 mb-4 flex items-center gap-3">
              {pecaOrigem.imageUrl && (
                <img
                  src={pecaOrigem.imageUrl}
                  alt={pecaOrigem.title}
                  className="w-[52px] h-[52px] object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="font-body text-[0.84rem] truncate">{pecaOrigem.title}</div>
                <div className="text-[0.72rem] text-muted-foreground">
                  Seu pedido vai direto para {pecaOrigem.artisan.shopName}
                </div>
              </div>
            </div>
          )}
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            Pode explicar do seu jeito. Não precisa saber o nome da técnica nem do material.
          </p>

          <label className={rotulo} htmlFor="titulo">Dê um nome ao projeto</label>
          <input
            id="titulo"
            className={`${campo} mb-5`}
            value={(valor("title") as string) ?? ""}
            onChange={(e) => mudar({ title: e.target.value })}
            placeholder="Painel de madeira para a sala"
          />

          <label className={rotulo} htmlFor="descricao">Sua ideia</label>
          <textarea
            id="descricao"
            rows={7}
            className={`${campo} leading-[1.7] resize-y`}
            value={(valor("description") as string) ?? ""}
            onChange={(e) => mudar({ description: e.target.value })}
            placeholder={
              pecaOrigem
                ? "Gostei desta peça, mas queria maior e em outro tom…"
                : "Quero um painel de madeira para a parede da sala, com uns 2 metros de largura…"
            }
          />
          <p className="text-[0.74rem] text-muted-foreground mt-2">
            Quanto mais detalhes, melhores as propostas que você recebe.
          </p>
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "referencias" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            Tem alguma referência?
          </h1>
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            Fotos, desenhos, plantas ou PDF ajudam o artesão a entender o que você imagina.
            Esta etapa é opcional.
          </p>

          <label className="border border-dashed border-border px-4 py-7 flex flex-col items-center gap-2 cursor-pointer hover:border-foreground transition-colors">
            {enviando ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-body text-[0.78rem]">
              {enviando ? "Enviando…" : "Escolher arquivo ou tirar foto"}
            </span>
            <span className="text-[0.7rem] text-muted-foreground">
              Imagem, PDF ou vídeo, até 10 MB
            </span>
            <input
              type="file"
              accept="image/*,application/pdf,video/mp4"
              className="hidden"
              onChange={async (e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (!arquivo) return;
                try {
                  await enviarAnexo(arquivo);
                  toast.success("Arquivo adicionado");
                } catch (erro) {
                  toast.error(erro instanceof Error ? erro.message : "Não conseguimos enviar agora.");
                }
              }}
            />
          </label>

          {anexos.length > 0 && (
            <ul className="mt-4 border border-border divide-y divide-border">
              {anexos.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-body text-[0.8rem] truncate">{a.file_name}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "detalhes" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            Algum detalhe importante?
          </h1>
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            Tudo aqui é opcional — o artesão pode sugerir o que fizer mais sentido.
          </p>

          {[
            { chave: "cor", nome: "Cor", exemplo: "Azul, tom natural…" },
            { chave: "tamanho", nome: "Tamanho ou medidas", exemplo: "2 m de largura" },
            { chave: "material", nome: "Material desejado", exemplo: "Madeira de demolição" },
            { chave: "acabamento", nome: "Acabamento", exemplo: "Fosco, envernizado…" },
            { chave: "inscricao", nome: "Nome, frase ou logo", exemplo: "" },
          ].map((c) => (
            <div key={c.chave} className="mb-4">
              <label className={rotulo} htmlFor={c.chave}>{c.nome}</label>
              <input
                id={c.chave}
                className={campo}
                placeholder={c.exemplo}
                value={((valor("customizations") as Record<string, string>) ?? {})[c.chave] ?? ""}
                onChange={(e) =>
                  mudar({
                    customizations: {
                      ...((valor("customizations") as Record<string, string>) ?? {}),
                      [c.chave]: e.target.value,
                    },
                  })
                }
              />
            </div>
          ))}
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "quantidade" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-6">
            Quantas unidades você precisa?
          </h1>
          <div className="space-y-2">
            {FAIXAS_QUANTIDADE.map((f) => (
              <button
                key={f.rotulo}
                onClick={() => mudar({ quantity_min: f.min, quantity_max: f.max })}
                className={cartao(
                  (valor("quantity_min") as number | null) === f.min &&
                    (valor("quantity_max") as number | null) === f.max,
                )}
              >
                <span className="font-body text-[0.86rem]">{f.rotulo}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "prazo" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            Quando você gostaria de receber?
          </h1>
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            O prazo será confirmado pelo artesão antes de você aprovar qualquer coisa.
          </p>

          <label className={rotulo} htmlFor="data">Tenho uma data em mente</label>
          <input
            id="data"
            type="date"
            className={`${campo} mb-5`}
            value={(valor("desired_date") as string) ?? ""}
            onChange={(e) => mudar({ desired_date: e.target.value || null })}
          />

          <label className={rotulo} htmlFor="periodo">Ou um período aproximado</label>
          <input
            id="periodo"
            className={campo}
            placeholder="Até o fim do mês, sem pressa…"
            value={(valor("desired_period") as string) ?? ""}
            onChange={(e) => mudar({ desired_period: e.target.value })}
          />
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "local" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            Para onde vai a entrega?
          </h1>
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            Só a cidade por enquanto. O endereço completo fica para depois da proposta aceita.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px] gap-3">
            <div>
              <label className={rotulo} htmlFor="cep">CEP</label>
              <input
                id="cep"
                inputMode="numeric"
                className={campo}
                placeholder="55000-000"
                value={(valor("delivery_postal_code") as string) ?? ""}
                onChange={(e) => mudar({ delivery_postal_code: e.target.value })}
              />
            </div>
            <div>
              <label className={rotulo} htmlFor="cidade">Cidade</label>
              <input
                id="cidade"
                className={campo}
                placeholder="Caruaru"
                value={(valor("delivery_city") as string) ?? ""}
                onChange={(e) => mudar({ delivery_city: e.target.value })}
              />
            </div>
            <div>
              <label className={rotulo} htmlFor="uf">Estado</label>
              <input
                id="uf"
                className={campo}
                placeholder="PE"
                value={(valor("delivery_state") as string) ?? ""}
                onChange={(e) => mudar({ delivery_state: e.target.value.toUpperCase().slice(0, 2) })}
              />
            </div>
          </div>
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "valor" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-2">
            Você já tem uma ideia de quanto pretende investir?
          </h1>
          <p className="text-[0.84rem] font-light text-muted-foreground mb-6">
            Isso ajuda o artesão a propor algo realista. Não é um valor fechado.
          </p>

          <div className="space-y-2">
            {FAIXAS_ORCAMENTO.map((f) => (
              <button
                key={f.rotulo}
                onClick={() => mudar({ budget_min_cents: f.min, budget_max_cents: f.max })}
                className={cartao(
                  (valor("budget_min_cents") as number | null) === f.min &&
                    (valor("budget_max_cents") as number | null) === f.max,
                )}
              >
                <span className="font-body text-[0.86rem]">{f.rotulo}</span>
              </button>
            ))}
          </div>

          <div className="mt-7">
            <label className={rotulo}>Quantas propostas você quer receber?</label>
            <div className="flex gap-2">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => mudar({ max_proposals: n })}
                  className={`flex-1 border px-3 py-2.5 font-body text-[0.8rem] transition-colors ${
                    ((valor("max_proposals") as number) ?? 3) === n
                      ? "border-foreground bg-parchment"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  {n === 1 ? "Só uma" : `Até ${n}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------------------------------------------------------- */}
      {etapa === "revisao" && (
        <>
          <h1 className="font-display text-[1.6rem] sm:text-[1.9rem] font-light mb-6">
            Confira antes de enviar
          </h1>

          <dl className="border border-border divide-y divide-border mb-6">
            {[
              ["Tipo", TIPOS.find((t) => t.tipo === valor("request_type"))?.rotulo],
              ["Projeto", (valor("title") as string) || "—"],
              ["Sua ideia", (valor("description") as string) || "—"],
              ["Referências", anexos.length ? `${anexos.length} arquivo(s)` : "Nenhuma"],
              [
                "Quantidade",
                FAIXAS_QUANTIDADE.find(
                  (f) =>
                    f.min === (valor("quantity_min") as number | null) &&
                    f.max === (valor("quantity_max") as number | null),
                )?.rotulo ?? "Ainda não sei",
              ],
              [
                "Prazo",
                (valor("desired_date") as string) ||
                  (valor("desired_period") as string) ||
                  "Ainda não defini",
              ],
              [
                "Entrega",
                [valor("delivery_city"), valor("delivery_state")].filter(Boolean).join(", ") || "—",
              ],
              [
                "Investimento",
                FAIXAS_ORCAMENTO.find(
                  (f) =>
                    f.min === (valor("budget_min_cents") as number | null) &&
                    f.max === (valor("budget_max_cents") as number | null),
                )?.rotulo ?? "Prefiro receber uma proposta",
              ],
            ].map(([chave, texto]) => (
              <div key={chave as string} className="px-4 py-3">
                <dt className="text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground mb-1">
                  {chave}
                </dt>
                <dd className="font-body text-[0.85rem] leading-snug whitespace-pre-wrap">{texto}</dd>
              </div>
            ))}
          </dl>

          {!podeEnviar && (
            <p className="text-[0.8rem] text-destructive mb-4">
              Conte um pouco mais sobre o que você precisa antes de enviar.
            </p>
          )}

          <button
            disabled={!podeEnviar || enviarEncomenda.isPending}
            onClick={async () => {
              await salvarAgora();
              try {
                const enviada = await enviarEncomenda.mutateAsync(rascunho.id);
                toast.success("Projeto enviado! Avisaremos quando um artesão responder.");
                navigate(`/minha-conta/projetos/${enviada.id}`);
              } catch (erro) {
                toast.error(
                  erro instanceof Error ? erro.message : "Não conseguimos enviar agora.",
                );
              }
            }}
            className="w-full bg-terra text-background py-3.5 font-body text-[0.72rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {enviarEncomenda.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Enviar meu projeto
          </button>

          <button
            onClick={async () => {
              await salvarAgora();
              toast.success("Rascunho salvo. Você pode continuar depois.");
              navigate("/minha-conta/projetos");
            }}
            className="w-full mt-2 border border-border py-3 font-body text-[0.7rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            Salvar e continuar depois
          </button>
        </>
      )}

      {/* Navegação */}
      {etapa !== "revisao" && (
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-border">
          <button
            onClick={anterior}
            className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          <button
            onClick={proxima}
            className="flex items-center gap-1.5 bg-espresso text-parchment px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
          >
            Continuar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CriarProjetoPage;
