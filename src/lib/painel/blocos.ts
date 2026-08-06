import type { Loja, TipoOferta } from "@/hooks/useMinhaLoja";

/**
 * O onboarding tem só quatro etapas — o suficiente para a loja existir e
 * o painel se adaptar ao que a pessoa faz. Tudo o mais fica em Minha
 * Loja, para ser preenchido aos poucos.
 */
export const ETAPAS_ONBOARDING = [
  { id: "sobre", titulo: "Sobre você" },
  { id: "trabalho", titulo: "O que você faz" },
  { id: "vender", titulo: "Como você quer vender" },
  { id: "historia", titulo: "Minha história" },
] as const;

export type EtapaOnboarding = (typeof ETAPAS_ONBOARDING)[number]["id"];

/** Blocos editáveis da área Minha Loja, incluindo os do onboarding. */
export const BLOCOS = [
  { id: "sobre", titulo: "Sobre você", resumo: "Nome, loja e cidade" },
  { id: "historia", titulo: "Minha história", resumo: "Como você começou" },
  { id: "fotos", titulo: "Fotos", resumo: "Você, o ateliê e a capa da loja" },
  { id: "trabalho", titulo: "Meu trabalho", resumo: "Materiais, técnicas e estilos" },
  { id: "vender", titulo: "Como vendo", resumo: "Formas de venda e capacidade" },
  { id: "encomendas", titulo: "Encomendas", resumo: "Valor mínimo, prazos e regiões" },
  { id: "aulas", titulo: "Aulas e experiências", resumo: "Visitas, oficinas e acessibilidade" },
  { id: "empresas", titulo: "Empresas", resumo: "Nota fiscal e pedidos corporativos" },
  { id: "contatos", titulo: "Contatos", resumo: "WhatsApp, redes e site" },
  { id: "adicionais", titulo: "Informações adicionais", resumo: "O que mais quiser contar" },
] as const;

export type BlocoId = (typeof BLOCOS)[number]["id"];

/** Escolhas da etapa 3 — cada uma habilita uma área do painel. */
export const FORMAS_DE_TRABALHAR: {
  tipo: TipoOferta;
  rotulo: string;
  descricao: string;
}[] = [
  { tipo: "product", rotulo: "Vender minhas peças", descricao: "Publicar peças prontas na loja" },
  { tipo: "custom_order", rotulo: "Receber encomendas", descricao: "Produzir sob pedido" },
  { tipo: "class", rotulo: "Oferecer aulas e oficinas", descricao: "Ensinar sua técnica" },
  { tipo: "studio_visit", rotulo: "Receber visitantes no ateliê", descricao: "Abrir seu espaço" },
  { tipo: "corporate", rotulo: "Vender para empresas", descricao: "Brindes e grandes pedidos" },
  { tipo: "undecided", rotulo: "Ainda não sei", descricao: "Você decide depois" },
];

export const FORMAS_DE_VENDA: { chave: keyof Loja; rotulo: string }[] = [
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

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

// ---------------------------------------------------------------------
// Retomada do onboarding
//
// Fica aqui, fora do componente, para poder ser testado sem montar tela.
// ---------------------------------------------------------------------
export interface EtapaProgressoLike {
  etapa: string;
  concluida: boolean;
}

/** Uma etapa do onboarding está respondida? Quem decide é o banco. */
export function etapaRespondida(
  etapa: EtapaOnboarding,
  progresso: EtapaProgressoLike[],
): boolean {
  const feito = (chave: string) =>
    progresso.find((e) => e.etapa === chave)?.concluida ?? false;

  switch (etapa) {
    case "sobre":
      return feito("nome") && feito("cidade");
    case "trabalho":
      // Material ou técnica já diz o suficiente sobre o que a pessoa faz.
      return feito("materiais") || feito("tecnicas");
    case "vender":
      return feito("vendas");
    case "historia":
      return feito("historia");
  }
}

/** Primeira etapa ainda sem resposta. */
export function primeiraEtapaPendente(
  progresso: EtapaProgressoLike[],
): EtapaOnboarding {
  return ETAPAS_ONBOARDING.find((e) => !etapaRespondida(e.id, progresso))?.id ?? "sobre";
}

/**
 * Onde retomar o onboarding.
 *
 * A etapa salva só vale se continuar pendente: se a pessoa parou na etapa
 * 2 e respondeu aquilo depois pelos blocos de Minha Loja, cair de novo
 * numa pergunta já respondida seria desperdício do tempo dela.
 */
export function etapaParaRetomar(
  salva: string | null | undefined,
  progresso: EtapaProgressoLike[],
): EtapaOnboarding {
  const valida = ETAPAS_ONBOARDING.some((e) => e.id === salva)
    ? (salva as EtapaOnboarding)
    : null;

  if (valida && !etapaRespondida(valida, progresso)) return valida;
  return primeiraEtapaPendente(progresso);
}

/** Quantas das etapas do onboarding já estão respondidas. */
export function etapasRespondidas(progresso: EtapaProgressoLike[]): number {
  return ETAPAS_ONBOARDING.filter((e) => etapaRespondida(e.id, progresso)).length;
}
