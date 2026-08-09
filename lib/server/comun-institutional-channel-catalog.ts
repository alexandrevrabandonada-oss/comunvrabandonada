import type { EssentialServiceCategory } from "../comun-essential-services-feature";

export type InstitutionalChannelStatus =
  | "source_verified"
  | "operationally_unchecked"
  | "operationally_confirmed"
  | "conflicting_sources"
  | "degraded"
  | "unavailable";

export type InstitutionalChannel = {
  id: string;
  institution: string;
  category: EssentialServiceCategory;
  channelType: "phone" | "web";
  label: string;
  destination: string;
  sourceUrl: string;
  sourceStatus: "source_verified";
  reviewedAt: "2026-08-09";
  operationalStatus: InstitutionalChannelStatus;
  identificationRequirement:
    "source_unclear" | "requested_by_service" | "required_by_service";
  protocolExpectation: "expected" | "source_unclear";
  notes: string;
  automationAllowed: false;
};

export const COMUN_INSTITUTIONAL_CHANNEL_CATALOG = [
  {
    id: "saaevr-115",
    institution: "SAAE Volta Redonda",
    category: "water_supply",
    channelType: "phone",
    label: "Ligar para o atendimento 115 do SAAE-VR",
    destination: "tel:115",
    sourceUrl: "https://www.saaevr.com.br/atendimento115.asp",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-09",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "source_unclear",
    protocolExpectation: "source_unclear",
    notes:
      "A fonte oficial lista falta d'água, serviços emergenciais, 115 e (24) 3344-2900. O COMUN não testou a ligação.",
    automationAllowed: false,
  },
  {
    id: "light-agencia-virtual",
    institution: "Light",
    category: "power_distribution",
    channelType: "web",
    label: "Abrir a Agência Virtual da Light",
    destination: "https://agenciavirtual.light.com.br/",
    sourceUrl: "https://agenciavirtual.light.com.br/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-09",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "expected",
    notes:
      "A Agência Virtual oficial exige identificação própria. CPF, instalação e credenciais devem ser informados somente à Light.",
    automationAllowed: false,
  },
  {
    id: "light-call-center",
    institution: "Light",
    category: "power_distribution",
    channelType: "phone",
    label: "Ligar para o atendimento da Light",
    destination: "tel:08000210196",
    sourceUrl: "https://www.light.com.br/SitePages/page-ressarcimento.aspx",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-09",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "requested_by_service",
    protocolExpectation: "expected",
    notes:
      "A fonte oficial informa atendimento telefônico 24 horas no 0800 021 0196. O COMUN não realizou ligação.",
    automationAllowed: false,
  },
  {
    id: "pmvr-lighting-156",
    institution: "Prefeitura de Volta Redonda",
    category: "public_lighting",
    channelType: "phone",
    label: "Ligar para a Central de Atendimento Único 156",
    destination: "tel:156",
    sourceUrl:
      "https://www.voltaredonda.rj.gov.br/85-noticias/semop/6858-central-de-atendimento-%C3%BAnico-156-de-volta-redonda-tem-novo-whatsapp/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-09",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "requested_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "A Prefeitura identifica iluminação pública entre as solicitações do 156. O COMUN não realizou ligação.",
    automationAllowed: false,
  },
  {
    id: "pmvr-lighting-service-reference",
    institution: "Secretaria Municipal de Infraestrutura de Volta Redonda",
    category: "public_lighting",
    channelType: "web",
    label: "Ver o serviço municipal de iluminação pública",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/",
    sourceStatus: "source_verified",
    reviewedAt: "2026-08-09",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "required_by_service",
    protocolExpectation: "source_unclear",
    notes:
      "A carta oficial exige nome, contato e endereço do local. Esses dados são fornecidos ao serviço, nunca armazenados pelo COMUN.",
    automationAllowed: false,
  },
] as const satisfies readonly InstitutionalChannel[];

export function listInstitutionalChannels(category: EssentialServiceCategory) {
  return COMUN_INSTITUTIONAL_CHANNEL_CATALOG.filter(
    (channel) =>
      channel.category === category &&
      !["conflicting_sources", "degraded", "unavailable"].includes(
        channel.operationalStatus,
      ),
  );
}

export function findInstitutionalChannel(
  category: EssentialServiceCategory,
  channelId: string,
) {
  return listInstitutionalChannels(category).find(
    (channel) => channel.id === channelId,
  );
}

export function publicInstitutionalChannel(channel: InstitutionalChannel) {
  return {
    id: channel.id,
    institution: channel.institution,
    category: channel.category,
    channelType: channel.channelType,
    label: channel.label,
    sourceUrl: channel.sourceUrl,
    sourceStatus: channel.sourceStatus,
    reviewedAt: channel.reviewedAt,
    operationalStatus: channel.operationalStatus,
    identificationRequirement: channel.identificationRequirement,
    protocolExpectation: channel.protocolExpectation,
    notes: channel.notes,
    automationAllowed: channel.automationAllowed,
  };
}
