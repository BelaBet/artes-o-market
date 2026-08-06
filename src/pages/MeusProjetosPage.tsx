import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Paperclip } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/contexts/AuthContext";
import {
  ROTULO_STATUS,
  TIPOS,
  useAnexos,
  useMinhasEncomendas,
  useRascunho,
} from "@/hooks/useEncomendas";

const Selo = ({ status }: { status: string }) => {
  const emAndamento = !["rascunho", "cancelada", "expirada", "concluida"].includes(status);
  return (
    <span
      className={`shrink-0 font-body text-[0.56rem] tracking-[0.12em] uppercase px-2 py-1 border ${
        status === "rascunho"
          ? "border-border text-muted-foreground"
          : emAndamento
            ? "border-terra text-terra"
            : "border-sage text-sage"
      }`}
    >
      {ROTULO_STATUS[status] ?? status}
    </span>
  );
};

const formatarData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

// ---------------------------------------------------------------------
// Lista
// ---------------------------------------------------------------------
export const MeusProjetosPage = () => {
  const { encomendas, loading } = useMinhasEncomendas();
  const { user, loading: carregandoSessao } = useAuth();
  usePageMeta("Meus projetos");

  if (carregandoSessao || loading) {
    return (
      <div className="max-w-[820px] mx-auto px-4 py-10">
        <Skeleton className="h-[2rem] w-1/3 rounded-none mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[5.5rem] w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-[1.7rem] font-light mb-3">Entre para ver seus projetos</h1>
        <Link
          to="/entrar"
          className="inline-block bg-espresso text-parchment px-7 py-3 font-body text-[0.7rem] tracking-[0.14em] uppercase"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[820px] mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-end justify-between gap-3 mb-7 pb-3 border-b border-border">
        <div>
          <div className="font-body text-[0.6rem] tracking-[0.18em] uppercase text-terra mb-1.5">
            Minha conta
          </div>
          <h1 className="font-display text-[1.6rem] sm:text-[2rem] font-light leading-tight">
            Meus projetos
          </h1>
        </div>
        <Link
          to="/projetos-sob-medida/criar"
          className="shrink-0 bg-terra text-background px-4 py-2.5 font-body text-[0.66rem] tracking-[0.12em] uppercase hover:brightness-95 transition-all"
        >
          Novo projeto
        </Link>
      </div>

      {encomendas.length === 0 ? (
        <div className="border border-border bg-background py-14 px-6 text-center">
          <div className="font-display text-[1.2rem] mb-1.5">Nenhum projeto ainda</div>
          <p className="text-[0.84rem] text-muted-foreground font-light mb-6 max-w-[400px] mx-auto leading-[1.7]">
            Quando você não encontra exatamente o que procura, conte sua ideia — encontramos
            artesãos que podem produzir.
          </p>
          <Link
            to="/projetos-sob-medida/criar"
            className="inline-block border border-foreground px-6 py-2.5 font-body text-[0.68rem] tracking-[0.12em] uppercase hover:bg-foreground hover:text-background transition-colors"
          >
            Criar meu primeiro projeto
          </Link>
        </div>
      ) : (
        <div className="border border-border divide-y divide-border">
          {encomendas.map((e) => {
            const respostas = (e.custom_request_matches ?? []) as { response_status: string }[];
            const interessados = respostas.filter((r) =>
              ["interessado", "proposta_enviada", "mais_informacoes"].includes(r.response_status),
            ).length;

            return (
              <Link
                key={e.id}
                to={
                  e.status === "rascunho"
                    ? `/projetos-sob-medida/criar?id=${e.id}`
                    : `/minha-conta/projetos/${e.id}`
                }
                className="flex items-start gap-3 px-4 py-4 hover:bg-parchment transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[1.02rem] leading-tight mb-1 truncate">
                    {e.title || TIPOS.find((t) => t.tipo === e.request_type)?.rotulo || "Projeto"}
                  </div>
                  <div className="text-[0.72rem] text-muted-foreground">
                    #{e.number} · {formatarData(e.created_at)}
                    {e.status !== "rascunho" && (
                      <>
                        {" · "}
                        {interessados > 0
                          ? `${interessados} artesão(s) responderam`
                          : "aguardando respostas"}
                      </>
                    )}
                  </div>
                </div>
                <Selo status={e.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------
// Detalhe
// ---------------------------------------------------------------------
export const ProjetoDetalhePage = () => {
  const { id } = useParams<{ id: string }>();
  const { rascunho: projeto, loading } = useRascunho(id);
  const { anexos } = useAnexos(id);

  usePageMeta(projeto?.title ?? "Projeto");

  if (loading) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-10">
        <Skeleton className="h-[2rem] w-2/3 rounded-none mb-4" />
        <Skeleton className="h-[10rem] w-full rounded-none" />
      </div>
    );
  }

  if (!projeto) {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-[1.5rem] font-light mb-2">Projeto não encontrado</h1>
        <Link to="/minha-conta/projetos" className="text-[0.82rem] text-terra hover:underline">
          Voltar para meus projetos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 sm:py-12">
      <Link
        to="/minha-conta/projetos"
        className="inline-flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Meus projetos
      </Link>

      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="font-display text-[1.6rem] sm:text-[2rem] font-light leading-tight">
          {projeto.title || "Projeto sem título"}
        </h1>
        <Selo status={projeto.status} />
      </div>
      <div className="text-[0.74rem] text-muted-foreground mb-7">
        #{projeto.number} · criado em {formatarData(projeto.created_at)}
      </div>

      {/* Estado atual, em linguagem de gente */}
      <div className="border border-border bg-parchment px-5 py-4 mb-7">
        <p className="text-[0.86rem] font-light leading-[1.7]">
          {projeto.status === "recebendo_propostas" &&
            "Seu projeto foi enviado para artesãos compatíveis. Avisaremos assim que alguém responder."}
          {projeto.status === "em_distribuicao" &&
            "Ainda não encontramos artesãos disponíveis para este projeto. Estamos procurando."}
          {projeto.status === "em_negociacao" && "Um artesão está conversando com você sobre este projeto."}
          {!["recebendo_propostas", "em_distribuicao", "em_negociacao"].includes(projeto.status) &&
            `Situação atual: ${ROTULO_STATUS[projeto.status] ?? projeto.status}.`}
        </p>
      </div>

      <dl className="border border-border divide-y divide-border">
        {[
          ["O que você pediu", projeto.description],
          ["Tipo", TIPOS.find((t) => t.tipo === projeto.request_type)?.rotulo],
          [
            "Entrega",
            [projeto.delivery_city, projeto.delivery_state].filter(Boolean).join(", ") || "—",
          ],
          [
            "Prazo desejado",
            projeto.desired_date
              ? formatarData(projeto.desired_date)
              : projeto.desired_period || "Ainda não defini",
          ],
        ].map(([chave, texto]) => (
          <div key={chave as string} className="px-4 py-3.5">
            <dt className="text-[0.6rem] tracking-[0.14em] uppercase text-muted-foreground mb-1">
              {chave}
            </dt>
            <dd className="font-body text-[0.86rem] leading-[1.6] whitespace-pre-wrap">
              {(texto as string) || "—"}
            </dd>
          </div>
        ))}
      </dl>

      {anexos.length > 0 && (
        <>
          <div className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-muted-foreground mt-7 mb-2">
            Referências enviadas
          </div>
          <ul className="border border-border divide-y divide-border">
            {anexos.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-center gap-3">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-body text-[0.82rem] truncate hover:text-terra transition-colors"
                  >
                    {a.file_name}
                  </a>
                ) : (
                  <span className="font-body text-[0.82rem] truncate">{a.file_name}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
