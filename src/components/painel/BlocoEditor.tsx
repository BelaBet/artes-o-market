import { useState } from "react";
import { Mic, Lock } from "lucide-react";
import {
  CampoAlternativas,
  CampoFoto,
  CampoNumero,
  CampoSelecao,
  CampoTexto,
  CampoTextoLongo,
} from "@/components/painel/campos";
import {
  useOfertas,
  useSelecaoVocabulario,
  useVocabulario,
  type Loja,
  type TipoOferta,
} from "@/hooks/useMinhaLoja";
import { FORMAS_DE_TRABALHAR, FORMAS_DE_VENDA, UFS, type BlocoId } from "@/lib/painel/blocos";

interface Props {
  bloco: BlocoId;
  loja: Loja;
  salvar: (campos: Partial<Loja>) => void;
}

/**
 * Renderiza um bloco de campos. É o mesmo componente usado pelo
 * onboarding curto e pela edição em Minha Loja — o que muda é só quais
 * blocos são mostrados e em que ordem.
 */
const BlocoEditor = ({ bloco, loja, salvar }: Props) => {
  const [rascunho, setRascunho] = useState<Partial<Loja>>({});
  const valor = <K extends keyof Loja>(campo: K): Loja[K] =>
    (rascunho[campo] !== undefined ? rascunho[campo] : loja[campo]) as Loja[K];

  const mudar = (campos: Partial<Loja>) => {
    setRascunho((r) => ({ ...r, ...campos }));
    salvar(campos);
  };

  const materiais = useVocabulario("materials");
  const tecnicas = useVocabulario("techniques");
  const estilos = useVocabulario("styles");
  const selMateriais = useSelecaoVocabulario("materials", loja.id);
  const selTecnicas = useSelecaoVocabulario("techniques", loja.id);
  const selEstilos = useSelecaoVocabulario("styles", loja.id);
  const { ofertas, alternar: alternarOferta } = useOfertas(loja.id);

  const regioes = (valor("delivery_regions") as string[]) ?? [];

  return (
    <>
      {bloco === "sobre" && (
        <>
          <p className="text-[0.86rem] font-light leading-[1.7] text-muted-foreground mb-6">
            Queremos conhecer você para ajudar seu trabalho a chegar a mais compradores.
          </p>
          <CampoTexto
            id="public_name"
            rotulo="Seu nome"
            valor={(valor("public_name") as string) ?? ""}
            onChange={(v) => mudar({ public_name: v })}
            placeholder="Como você quer ser chamado"
          />
          <CampoTexto
            id="shop_name"
            rotulo="Nome da sua loja ou ateliê"
            valor={(valor("shop_name") as string) ?? ""}
            onChange={(v) => mudar({ shop_name: v })}
            placeholder="Ateliê Ana Lima"
          />
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-x-4">
            <CampoTexto
              id="city"
              rotulo="Cidade"
              valor={(valor("city") as string) ?? ""}
              onChange={(v) => mudar({ city: v })}
              placeholder="Caruaru"
            />
            <CampoTexto
              id="state"
              rotulo="Estado"
              valor={(valor("state") as string) ?? ""}
              onChange={(v) => mudar({ state: v.toUpperCase().slice(0, 2) })}
              placeholder="PE"
            />
          </div>
        </>
      )}

      {bloco === "trabalho" && (
        <>
          <CampoSelecao
            rotulo="Com o que você trabalha"
            ajuda="Pode marcar quantos quiser."
            opcoes={materiais.opcoes}
            carregando={materiais.loading}
            selecionados={selMateriais.selecionados}
            onAlternar={selMateriais.alternar}
          />
          <CampoSelecao
            rotulo="Como suas peças são feitas"
            opcoes={tecnicas.opcoes}
            carregando={tecnicas.loading}
            selecionados={selTecnicas.selecionados}
            onAlternar={selTecnicas.alternar}
          />
          <CampoSelecao
            rotulo="O estilo das suas peças"
            ajuda="Escolha até cinco. Pode deixar para depois."
            maximo={5}
            opcoes={estilos.opcoes}
            carregando={estilos.loading}
            selecionados={selEstilos.selecionados}
            onAlternar={selEstilos.alternar}
          />
        </>
      )}

      {bloco === "vender" && (
        <>
          <CampoAlternativas
            rotulo="Como você vende"
            alternativas={FORMAS_DE_VENDA.map((f) => ({ chave: f.chave as string, rotulo: f.rotulo }))}
            valores={Object.fromEntries(
              FORMAS_DE_VENDA.map((f) => [f.chave as string, !!valor(f.chave)]),
            )}
            onAlternar={(chave, v) => mudar({ [chave]: v } as Partial<Loja>)}
          />
          <CampoNumero
            id="average_production_days"
            rotulo="Tempo médio para produzir uma peça"
            sufixo="dias"
            valor={valor("average_production_days") as number | null}
            onChange={(v) => mudar({ average_production_days: v })}
          />
          <CampoNumero
            id="production_capacity_monthly"
            rotulo="Quantas peças você costuma fazer por mês"
            sufixo="peças"
            valor={valor("production_capacity_monthly") as number | null}
            onChange={(v) => mudar({ production_capacity_monthly: v })}
            ajuda="Uma estimativa basta. Você pode alterar quando quiser."
          />
          <CampoNumero
            id="team_size"
            rotulo="Quantas pessoas trabalham com você"
            sufixo="pessoas"
            valor={valor("team_size") as number | null}
            onChange={(v) => mudar({ team_size: v })}
            ajuda="Coloque 0 se você trabalha sozinho."
          />
          <CampoNumero
            id="years_of_experience"
            rotulo="Há quantos anos você faz isso"
            sufixo="anos"
            valor={valor("years_of_experience") as number | null}
            onChange={(v) => mudar({ years_of_experience: v })}
          />
        </>
      )}

      {bloco === "encomendas" && (
        <>
          <CampoAlternativas
            rotulo="Encomendas"
            ajuda="Marcando aqui, você passa a receber pedidos personalizados de compradores."
            alternativas={[
              { chave: "accepts_custom_orders", rotulo: "Aceito encomendas" },
              { chave: "accepts_large_orders", rotulo: "Aceito grandes quantidades" },
            ]}
            valores={{
              accepts_custom_orders: !!valor("accepts_custom_orders"),
              accepts_large_orders: !!valor("accepts_large_orders"),
            }}
            onAlternar={(chave, v) => mudar({ [chave]: v } as Partial<Loja>)}
          />
          <CampoNumero
            id="min_order_value"
            rotulo="Valor mínimo que você aceita por encomenda"
            sufixo="reais"
            valor={
              valor("min_order_value_cents") != null
                ? Math.round((valor("min_order_value_cents") as number) / 100)
                : null
            }
            onChange={(v) => mudar({ min_order_value_cents: v == null ? null : v * 100 })}
            ajuda="Deixe em branco se prefere avaliar caso a caso."
            max={99999}
          />
          <CampoNumero
            id="minimum_order_days"
            rotulo="Prazo mínimo para encomendas"
            sufixo="dias"
            valor={valor("minimum_order_days") as number | null}
            onChange={(v) => mudar({ minimum_order_days: v })}
          />
          <CampoSelecao
            rotulo="Para quais estados você envia"
            ajuda="Deixe vazio se envia para todo o Brasil."
            opcoes={UFS.map((uf) => ({ id: uf, name: uf }))}
            selecionados={regioes}
            onAlternar={(uf, marcado) =>
              mudar({
                delivery_regions: marcado
                  ? [...regioes, uf]
                  : regioes.filter((r) => r !== uf),
              })
            }
          />
          <CampoTextoLongo
            id="custom_order_notes"
            rotulo="Observações sobre encomendas"
            linhas={4}
            valor={(valor("custom_order_notes") as string) ?? ""}
            onChange={(v) => mudar({ custom_order_notes: v })}
            placeholder="Trabalho com no máximo duas encomendas por vez…"
          />
        </>
      )}

      {bloco === "aulas" && (
        <>
          <CampoAlternativas
            rotulo="Aulas, oficinas e visitas"
            alternativas={[
              { chave: "receives_visitors", rotulo: "Recebo visitantes no ateliê" },
              { chave: "visit_by_appointment", rotulo: "Visitas só com agendamento" },
            ]}
            valores={{
              receives_visitors: !!valor("receives_visitors"),
              visit_by_appointment: !!valor("visit_by_appointment"),
            }}
            onAlternar={(chave, v) => mudar({ [chave]: v } as Partial<Loja>)}
          />
          <CampoTextoLongo
            id="teaching_notes"
            rotulo="O que você ensina"
            linhas={5}
            valor={(valor("teaching_notes") as string) ?? ""}
            onChange={(v) => mudar({ teaching_notes: v })}
            placeholder="Ensino torno para iniciantes, em turmas de até 6 pessoas…"
          />
          <CampoTextoLongo
            id="accessibility_notes"
            rotulo="Acessibilidade do seu espaço"
            linhas={3}
            valor={(valor("accessibility_notes") as string) ?? ""}
            onChange={(v) => mudar({ accessibility_notes: v })}
            placeholder="Entrada sem degraus, banheiro adaptado…"
            ajuda="Ajuda quem precisa saber antes de marcar uma visita."
          />
        </>
      )}

      {bloco === "empresas" && (
        <>
          <CampoAlternativas
            rotulo="Vendas para empresas"
            alternativas={[
              { chave: "sells_to_companies", rotulo: "Vendo para empresas" },
              { chave: "issues_invoice", rotulo: "Consigo emitir nota fiscal" },
            ]}
            valores={{
              sells_to_companies: !!valor("sells_to_companies"),
              issues_invoice: !!valor("issues_invoice"),
            }}
            onAlternar={(chave, v) => mudar({ [chave]: v } as Partial<Loja>)}
          />
          <CampoTexto
            id="company_name"
            rotulo="Razão social"
            valor={(valor("company_name") as string) ?? ""}
            onChange={(v) => mudar({ company_name: v })}
            placeholder="Se você tem empresa aberta"
          />
          <CampoTexto
            id="company_document"
            rotulo="CNPJ"
            valor={(valor("company_document") as string) ?? ""}
            onChange={(v) => mudar({ company_document: v })}
            placeholder="00.000.000/0001-00"
            ajuda="Fica só com a plataforma — não aparece na sua loja."
          />
          <CampoNumero
            id="corporate_min_quantity"
            rotulo="Quantidade mínima para pedido de empresa"
            sufixo="peças"
            valor={valor("corporate_min_quantity") as number | null}
            onChange={(v) => mudar({ corporate_min_quantity: v })}
          />
        </>
      )}

      {bloco === "fotos" && (
        <>
          <p className="text-[0.84rem] font-light leading-[1.7] mb-5 text-muted-foreground">
            Não precisa ser foto profissional. Procure um lugar bem iluminado, evite fotos
            tremidas e mostre quem faz e onde as peças nascem.
          </p>
          <CampoFoto
            rotulo="Sua foto"
            artisanId={loja.id}
            pasta="avatar"
            valor={(valor("avatar_url") as string) ?? null}
            onChange={(caminho) => mudar({ avatar_url: caminho })}
          />
          <CampoFoto
            rotulo="Logo da loja"
            artisanId={loja.id}
            pasta="logo"
            valor={(valor("logo_url") as string) ?? null}
            onChange={(caminho) => mudar({ logo_url: caminho })}
          />
          <CampoFoto
            rotulo="Foto do ateliê"
            artisanId={loja.id}
            pasta="atelie"
            valor={(valor("workshop_image_url") as string) ?? null}
            onChange={(caminho) => mudar({ workshop_image_url: caminho })}
          />
          <CampoFoto
            rotulo="Você trabalhando"
            ajuda="Compradores gostam de ver a peça sendo feita."
            artisanId={loja.id}
            pasta="trabalhando"
            valor={(valor("working_image_url") as string) ?? null}
            onChange={(caminho) => mudar({ working_image_url: caminho })}
          />
          <CampoFoto
            rotulo="Capa da loja"
            artisanId={loja.id}
            pasta="capa"
            valor={(valor("cover_url") as string) ?? null}
            onChange={(caminho) => mudar({ cover_url: caminho })}
          />
        </>
      )}

      {bloco === "contatos" && (
        <>
          <CampoTexto
            id="whatsapp"
            rotulo="WhatsApp"
            valor={(valor("whatsapp") as string) ?? ""}
            onChange={(v) => mudar({ whatsapp: v })}
            placeholder="(81) 90000-0000"
          />
          <CampoAlternativas
            rotulo="Quem pode ver seu WhatsApp"
            ajuda="Se você não marcar, seu número fica só com a plataforma e o contato acontece pelas mensagens do site."
            alternativas={[
              { chave: "whatsapp_publico", rotulo: "Mostrar meu WhatsApp na minha loja" },
            ]}
            valores={{ whatsapp_publico: !!valor("whatsapp_publico") }}
            onAlternar={(_, v) => mudar({ whatsapp_publico: v })}
          />
          <CampoTexto
            id="instagram"
            rotulo="Instagram"
            valor={(valor("instagram") as string) ?? ""}
            onChange={(v) => mudar({ instagram: v })}
            placeholder="@seuatelie"
          />
          <CampoTexto
            id="facebook"
            rotulo="Facebook"
            valor={(valor("facebook") as string) ?? ""}
            onChange={(v) => mudar({ facebook: v })}
            placeholder="facebook.com/seuatelie"
          />
          <CampoTexto
            id="website"
            rotulo="Site"
            valor={(valor("website") as string) ?? ""}
            onChange={(v) => mudar({ website: v })}
            placeholder="www.seuatelie.com.br"
          />
        </>
      )}

      {bloco === "adicionais" && (
        <CampoTextoLongo
          id="additional_notes"
          rotulo="O que mais você quer contar"
          linhas={6}
          valor={(valor("additional_notes") as string) ?? ""}
          onChange={(v) => mudar({ additional_notes: v })}
          placeholder="Prêmios, participação em feiras, projetos com a comunidade…"
        />
      )}

      {bloco === "historia" && (
        <>
          <p className="text-[0.88rem] font-light leading-[1.7] mb-4">
            Conte sua história do jeito que for mais fácil para você.
          </p>

          {/* Gravação depende de um serviço de transcrição ainda não
              contratado. O botão fica visível e desativado, com o motivo
              à mostra — nada de promessa que não se cumpre. */}
          <div className="flex items-center gap-2 mb-5">
            <button
              type="button"
              disabled
              aria-disabled
              title="Ainda não disponível"
              className="flex items-center gap-2 border border-border px-4 py-2.5 font-body text-[0.7rem] tracking-[0.12em] uppercase text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <Mic className="w-3.5 h-3.5" /> Falar
              <Lock className="w-3 h-3" />
            </button>
            <span className="text-[0.72rem] text-muted-foreground">
              Gravar por voz chega em breve
            </span>
          </div>

          <CampoTextoLongo
            id="bio"
            rotulo="Sua história"
            valor={(valor("bio") as string) ?? ""}
            onChange={(v) => mudar({ bio: v })}
            placeholder="Como você começou? Alguém te ensinou? O que você mais gosta de produzir?"
            ajuda="Algumas perguntas que ajudam: como começou, quem ensinou, há quanto tempo trabalha com isso, o que torna suas peças especiais."
          />
        </>
      )}

      {bloco === "vender" && null}
    </>
  );
};

/** Etapa 3 do onboarding: escolhas que habilitam áreas do painel. */
export const EscolhaFormasDeTrabalhar = ({ lojaId }: { lojaId: string }) => {
  const { ofertas, alternar } = useOfertas(lojaId);

  return (
    <CampoAlternativas
      rotulo="Como você gostaria de trabalhar por aqui?"
      ajuda="Isso só liga as áreas certas no seu painel. Dá para mudar quando quiser."
      alternativas={FORMAS_DE_TRABALHAR.map((f) => ({ chave: f.tipo, rotulo: f.rotulo }))}
      valores={Object.fromEntries(ofertas.map((o) => [o, true]))}
      onAlternar={(chave, v) => alternar(chave as TipoOferta, v)}
    />
  );
};

export default BlocoEditor;
