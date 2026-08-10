import type { RelataCategory } from "../comun-relata-contract";

type UrbanIncidentCategory = Extract<
  RelataCategory,
  "urban_flooding" | "stormwater_drainage" | "tree_hazard"
>;

export type UrbanIncidentInstitutionalChannel = {
  id: string;
  institution: string;
  territory: "Volta Redonda";
  categories: readonly UrbanIncidentCategory[];
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
 * Evidence-only catalog for P6B-B. Entries are not forwarding adapters and
 * must not be opened, called or submitted by automation.
 */
export const COMUN_URBAN_INCIDENT_CHANNEL_CATALOG = [
  {
    id: "pmvr-defesa-civil-199",
    institution: "Defesa Civil de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["urban_flooding", "tree_hazard"],
    channelType: "phone",
    destination: "tel:199",
    sourceUrl:
      "https://www.voltaredonda.rj.gov.br/comunicacao/noticias/24-gabinete-do-prefeito/9215-preven%C3%A7%C3%A3o-defesa-civil-de-volta-redonda-d%C3%A1-dicas-de-como-agir-em-caso-de-chuva-forte/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "source_unclear",
    protocolExpectation: "source_unclear",
    notes:
      "Fonte oficial orienta procurar local seguro, não atravessar via alagada e acionar 199 em emergência. O COMUN não realizou ligação nem afirma acionamento.",
    automationAllowed: false,
  },
  {
    id: "pmvr-smi-drainage-162",
    institution: "Secretaria Municipal de Infraestrutura de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["stormwater_drainage"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/162/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/162/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "Carta oficial cobre drenagem, bueiros, bocas de lobo, canaletas, manilhas e tampas. O prazo administrativo informado não é prazo de emergência.",
    automationAllowed: false,
  },
  {
    id: "pmvr-smi-watercourses-147",
    institution: "Secretaria Municipal de Infraestrutura de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["stormwater_drainage"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/147/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/147/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "expected",
    notes:
      "Carta oficial cobre limpeza de córregos, rios e canais e diferencia manutenção de resposta emergencial.",
    automationAllowed: false,
  },
  {
    id: "pmvr-smma-fallen-tree-143",
    institution: "Secretaria Municipal de Meio Ambiente de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["tree_hazard"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/143/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/143/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "expected",
    notes:
      "Carta oficial cobre retirada de árvores caídas e avaliação local; seu prazo administrativo não substitui o 199 quando há risco imediato.",
    automationAllowed: false,
  },
  {
    id: "pmvr-smma-tree-evaluation-196",
    institution: "Secretaria Municipal de Meio Ambiente de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["tree_hazard"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/196/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/196/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "expected",
    notes:
      "Carta oficial cobre avaliação e corte ou poda em domínio público. Poda rotineira sem risco não é classificada automaticamente como tree_hazard.",
    automationAllowed: false,
  },
  {
    id: "pmvr-fiscaliza-reference-435",
    institution: "Prefeitura de Volta Redonda",
    territory: "Volta Redonda",
    categories: ["stormwater_drainage", "tree_hazard"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-10",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "expected",
    notes:
      "Referência geral municipal sem uso como fallback. Nenhum adapter foi ativado neste tijolo.",
    automationAllowed: false,
  },
] as const satisfies readonly UrbanIncidentInstitutionalChannel[];
