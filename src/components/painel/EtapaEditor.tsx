import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

export const ETAPAS = [
  { id: "sobre", titulo: "Sobre você" },
  { id: "historia", titulo: "Minha história" },
  { id: "produz", titulo: "O que você produz" },
  { id: "como", titulo: "Como você produz" },
  { id: "estilo", titulo: "Estilo das peças" },
  { id: "oferece", titulo: "O que você oferece" },
  { id: "vende", titulo: "Como você vende" },
  { id: "capacidade", titulo: "Tempo e capacidade" },
  { id: "fotos", titulo: "Fotos" },
  { id: "contatos", titulo: "Contatos" },
] as const;

export type EtapaId = (typeof ETAPAS)[number]["id"];

const OFERTAS: { tipo: TipoOferta; rotulo: string }[] = [
  { tipo: "product", rotulo: "Vender minhas peças" },
  { tipo: "custom_order", rotulo: "Receber encomendas personalizadas" },
  { tipo: "class", rotulo: "Oferecer aulas" },
  { tipo: "workshop", rotulo: "Realizar oficinas" },
  { tipo: "course", rotulo: "Ministrar cursos" },
  { tipo: "studio_visit", rotulo: "Receber visitantes no meu ateliê" },
  { tipo: "cultural_experience", rotulo: "Criar experiências culturais" },
  { tipo: "lecture", rotulo: "Dar palestras" },
  { tipo: "event", rotulo: "Participar de eventos" },
  { tipo: "corporate", rotulo: "Vender para empresas" },
  { tipo: "stores", rotulo: "Vender para lojas" },
  { tipo: "hotels", rotulo: "Vender para hotéis e pousadas" },
  { tipo: "architects", rotulo: "Trabalhar com arquitetos e decoradores" },
  { tipo: "corporate_gifts", rotulo: "Produzir brindes empresariais" },
  { tipo: "school", rotulo: "Atividades para escolas" },
  { tipo: "undecided", rotulo: "Ainda não sei" },
];

const FORMAS_DE_VENDA = [
  { chave: "has_ready_stock", rotulo: "Tenho peças à pronta entrega" },
  { chave: "accepts_custom_orders", rotulo: "Produzo sob encomenda" },
  { chave: "ships_nationwide", rotulo: "Envio para todo o Brasil" },
  { chave: "accepts_large_orders", rotulo: "Aceito grandes pedidos" },
  { chave: "sells_to_people", rotulo: "Vendo para pessoas" },
  { chave: "sells_to_companies", rotulo: "Vendo para empresas" },
  { chave: "sells_to_stores", rotulo: "Vendo para lojas" },
  { chave: "sells_to_architects", rotulo: "Vendo para decoradores" },
  { chave: "receives_visitors", rotulo: "Aceito visitas ao ateliê" },
];

interface Props {
  etapa: EtapaId;
  loja: Loja;
  salvar: (campos: Partial<Loja>) => void;
  onIrPara: (etapa: EtapaId) => void;
  onSair: () => void;
}

const EtapaEditor = ({ etapa, loja, salvar, onIrPara, onSair }: Props) => {
  const indice = ETAPAS.findIndex((e) => e.id === etapa);
  const atual = ETAPAS[indice];

  // Estado local para o campo responder na hora; o banco recebe depois,
  // pelo salvamento automático.
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="font-body text-[0.6rem] tracking-[0.16em] uppercase text-terra">
          Etapa {indice + 1} de {ETAPAS.length}
        </span>
        <button
          onClick={onSair}
          className="font-body text-[0.66rem] tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          Fazer isso depois
        </button>
      </div>

      <h3 className="font-display text-[1.5rem] sm:text-[1.75rem] font-light mb-6">
        {atual.titulo}
      </h3>

      {etapa === "sobre" && (
        <>
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
            ajuda="Essas informações ajudam compradores a conhecer quem está por trás das peças."
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

      {etapa === "historia" && (
        <>
          <p className="text-[0.88rem] font-light leading-[1.7] mb-5 text-muted-foreground">
            Conte sua história do jeito que for mais fácil para você. Não precisa se
            preocupar com a forma de escrever — o que importa é o que você faz e por quê.
          </p>
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

      {etapa === "produz" && (
        <CampoSelecao
          rotulo="Com o que você trabalha"
          ajuda="Pode marcar quantos quiser."
          opcoes={materiais.opcoes}
          carregando={materiais.loading}
          selecionados={selMateriais.selecionados}
          onAlternar={selMateriais.alternar}
        />
      )}

      {etapa === "como" && (
        <CampoSelecao
          rotulo="Como suas peças são feitas"
          opcoes={tecnicas.opcoes}
          carregando={tecnicas.loading}
          selecionados={selTecnicas.selecionados}
          onAlternar={selTecnicas.alternar}
        />
      )}

      {etapa === "estilo" && (
        <CampoSelecao
          rotulo="O estilo das suas peças"
          ajuda="Escolha até cinco."
          maximo={5}
          opcoes={estilos.opcoes}
          carregando={estilos.loading}
          selecionados={selEstilos.selecionados}
          onAlternar={selEstilos.alternar}
        />
      )}

      {etapa === "oferece" && (
        <CampoAlternativas
          rotulo="Como você gostaria de compartilhar seu trabalho?"
          ajuda="O painel se ajusta ao que você marcar."
          alternativas={OFERTAS.map((o) => ({ chave: o.tipo, rotulo: o.rotulo }))}
          valores={Object.fromEntries(ofertas.map((o) => [o, true]))}
          onAlternar={(chave, v) => alternarOferta(chave as TipoOferta, v)}
        />
      )}

      {etapa === "vende" && (
        <CampoAlternativas
          rotulo="Como você vende"
          alternativas={FORMAS_DE_VENDA}
          valores={Object.fromEntries(
            FORMAS_DE_VENDA.map((f) => [f.chave, !!valor(f.chave as keyof Loja)]),
          )}
          onAlternar={(chave, v) => mudar({ [chave]: v } as Partial<Loja>)}
        />
      )}

      {etapa === "capacidade" && (
        <>
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
            id="minimum_order_days"
            rotulo="Prazo mínimo para encomendas"
            sufixo="dias"
            valor={valor("minimum_order_days") as number | null}
            onChange={(v) => mudar({ minimum_order_days: v })}
          />
          <CampoNumero
            id="years_of_experience"
            rotulo="Há quantos anos você trabalha com isso"
            sufixo="anos"
            valor={valor("years_of_experience") as number | null}
            onChange={(v) => mudar({ years_of_experience: v })}
          />
        </>
      )}

      {etapa === "fotos" && (
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

      {etapa === "contatos" && (
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

      {/* Navegação */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-border">
        <button
          onClick={() => indice > 0 && onIrPara(ETAPAS[indice - 1].id)}
          disabled={indice === 0}
          className="flex items-center gap-1.5 font-body text-[0.68rem] tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Voltar
        </button>

        {indice < ETAPAS.length - 1 ? (
          <button
            onClick={() => onIrPara(ETAPAS[indice + 1].id)}
            className="flex items-center gap-1.5 bg-espresso text-parchment px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-125 transition-all"
          >
            Continuar <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onSair}
            className="bg-terra text-background px-5 py-2.5 font-body text-[0.68rem] tracking-[0.14em] uppercase hover:brightness-95 transition-all"
          >
            Concluir
          </button>
        )}
      </div>
    </div>
  );
};

export default EtapaEditor;
