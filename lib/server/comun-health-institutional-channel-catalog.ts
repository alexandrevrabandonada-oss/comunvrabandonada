export type ComunHealthChannelSphere =
  | "municipal"
  | "state"
  | "federal"
  | "emergency";

export type ComunHealthInstitutionalChannel = {
  id: string;
  institution: string;
  sphere: ComunHealthChannelSphere;
  categories: readonly ["public_health"];
  channelType: "web" | "phone" | "email" | "in_person";
  destination: string | null;
  sourceUrl: string;
  reviewedAt: "2026-08-10";
  sourceStatus: "source_verified" | "conflicting_sources";
  operationalStatus: "operationally_unchecked";
  identificationRequirement: "not_required" | "required" | "depends_on_manifestation" | "source_conflict";
  anonymity: "accepted" | "limited" | "source_conflict";
  confidentiality: "available" | "stated" | "source_conflict";
  protocolExpectation: "expected" | "source_unclear";
  hours: string | null;
  notes: string;
  automationAllowed: false;
};

/**
 * Public evidence catalog only. No health report text, attachment, location or
 * person data is ever interpolated into these destinations.
 */
export const COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG = [
  {
    id: "vr-sus-ombudsman-source-v1",
    institution: "Ouvidoria SUS de Volta Redonda",
    sphere: "municipal",
    categories: ["public_health"],
    channelType: "web",
    destination: null,
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/302/",
    reviewedAt: "2026-08-10",
    sourceStatus: "conflicting_sources",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "source_conflict",
    anonymity: "source_conflict",
    confidentiality: "source_conflict",
    protocolExpectation: "source_unclear",
    hours: "Segunda a sexta, 7h às 17h, segundo a Carta de Serviços 302",
    notes:
      "As Cartas de Serviços municipais 302 e 572 divergem sobre documento exigido e prazo. Consulte a fonte oficial antes de manifestar-se.",
    automationAllowed: false,
  },
  {
    id: "rj-ses-ouverj-v1",
    institution: "Ouvidoria da Secretaria de Estado de Saúde do RJ / OuvERJ",
    sphere: "state",
    categories: ["public_health"],
    channelType: "web",
    destination: "https://www.rj.gov.br/ouverj/",
    sourceUrl: "https://www.rj.gov.br/saude/participacao-social",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    anonymity: "limited",
    confidentiality: "available",
    protocolExpectation: "expected",
    hours: "Atendimento presencial de segunda a sexta, 9h às 17h",
    notes:
      "A fonte estadual informa que solicitações anônimas ou sigilosas podem ter limitações. O COMUN não transfere dados para o canal.",
    automationAllowed: false,
  },
  {
    id: "br-ouvsus-v1",
    institution: "Ouvidoria-Geral do SUS — OuvSUS",
    sphere: "federal",
    categories: ["public_health"],
    channelType: "web",
    destination: "https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus",
    sourceUrl: "https://www.gov.br/saude/pt-br/canais-de-atendimento/ouvsus",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    anonymity: "accepted",
    confidentiality: "stated",
    protocolExpectation: "expected",
    hours: "Telefone 136: segunda a sexta, 8h às 20h; sábado, 8h às 18h",
    notes:
      "Canal geral do SUS. A pessoa fornece eventuais dados exigidos diretamente ao serviço, nunca ao COMUN nesta etapa.",
    automationAllowed: false,
  },
  {
    id: "br-samu-192-v1",
    institution: "SAMU 192",
    sphere: "emergency",
    categories: ["public_health"],
    channelType: "phone",
    destination: "192",
    sourceUrl: "https://www.gov.br/saude/pt-br/composicao/saes/samu-192",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    anonymity: "limited",
    confidentiality: "stated",
    protocolExpectation: "source_unclear",
    hours: "Serviço de urgência e emergência",
    notes:
      "Somente para urgência ou emergência. O COMUN não liga, não envia dados e não afirma que o serviço foi acionado.",
    automationAllowed: false,
  },
] as const satisfies readonly ComunHealthInstitutionalChannel[];

export function listComunHealthInstitutionalChannels() {
  return COMUN_HEALTH_INSTITUTIONAL_CHANNEL_CATALOG.map((channel) => ({
    ...channel,
    categories: [...channel.categories],
  }));
}
