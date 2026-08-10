import type { RelataCategory } from "../comun-relata-contract";

type EnvironmentalChannelCategory = Extract<
  RelataCategory,
  | "active_fire"
  | "smoke_or_environmental_trace"
  | "environmental_pollution"
  | "waste_or_debris"
>;

export type EnvironmentalInstitutionalChannel = {
  id: string;
  institution: string;
  territory: "Volta Redonda" | "Estado do Rio de Janeiro";
  categories: readonly EnvironmentalChannelCategory[];
  channelType: "phone" | "web";
  destination: string;
  sourceUrl: string;
  sourceStatus: "source_verified";
  reviewedAt: "2026-08-10";
  operationalStatus: "operationally_unchecked";
  identificationRequirement:
    | "source_unclear"
    | "requested_by_service"
    | "required_by_service";
  protocolExpectation: "expected" | "source_unclear";
  notes: string;
  automationAllowed: false;
};

/**
 * Versioned, server-side evidence catalog. P6B-A does not expose these entries
 * as forwarding adapters because Production does not yet allow the
 * environmental_incident source domain.
 */
export const COMUN_ENVIRONMENTAL_CHANNEL_CATALOG = [
  {
    id: "cbmerj-emergency-193",
    institution: "Corpo de Bombeiros Militar do Estado do Rio de Janeiro",
    territory: "Estado do Rio de Janeiro",
    categories: ["active_fire"],
    channelType: "phone",
    destination: "tel:193",
    sourceUrl:
      "https://www.cbmerj.rj.gov.br/sobre-o-cbmerj/unidade/unidades-operacionais/centro-de-operacoes-do-corpo-de-bombeiros-cocb/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "requested_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "A fonte oficial orienta ligar 193 em emergência. O COMUN não realizou ligação e não afirma que o socorro foi acionado.",
    automationAllowed: false,
  },
  {
    id: "pmvr-smma-danos-ambientais",
    institution: "Secretaria Municipal de Meio Ambiente de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["smoke_or_environmental_trace", "environmental_pollution"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/201/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/201/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "A carta oficial inclui poluição e queimada e pede local e descrição. É referência de responsabilidade provável, não adapter ativo.",
    automationAllowed: false,
  },
  {
    id: "inea-ouvidoria-ambiental",
    institution: "Instituto Estadual do Ambiente",
    territory: "Estado do Rio de Janeiro",
    categories: ["smoke_or_environmental_trace", "environmental_pollution"],
    channelType: "web",
    destination: "https://www.inea.rj.gov.br/ouvidoria/",
    sourceUrl: "https://www.inea.rj.gov.br/ouvidoria/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "source_unclear",
    protocolExpectation: "expected",
    notes:
      "A Ouvidoria oficial recebe denúncias e informa geração de protocolo no canal eletrônico. Nenhum formulário foi submetido.",
    automationAllowed: false,
  },
  {
    id: "pmvr-waste-156",
    institution: "Prefeitura de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["waste_or_debris"],
    channelType: "phone",
    destination: "tel:156",
    sourceUrl:
      "https://www.voltaredonda.rj.gov.br/comunicacao/noticias/85-semop/11474-volta-redonda-c%C3%A2meras-da-ordem-p%C3%BAblica-flagram-descarte-irregular-de-lixo-e-autor-%C3%A9-responsabilizado/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "requested_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "A fonte municipal atual indica o 156 para descarte irregular e solicita endereço e, se possível, evidência. O COMUN não realizou ligação.",
    automationAllowed: false,
  },
] as const satisfies readonly EnvironmentalInstitutionalChannel[];
