export type ComunEducationChannelSphere =
  "municipal" | "state" | "federal" | "protection" | "emergency";

export type ComunEducationInstitutionalChannel = {
  id: string;
  institution: string;
  sphere: ComunEducationChannelSphere;
  categories: readonly ["public_education"];
  channelType: "web" | "phone" | "email" | "in_person";
  destination: string;
  sourceUrl: string;
  reviewedAt: "2026-08-10";
  sourceStatus: "source_verified" | "source_unclear";
  operationalStatus: "operationally_unchecked";
  identificationRequirement:
    "not_required" | "required" | "depends_on_manifestation" | "source_unclear";
  confidentiality: "available" | "stated" | "source_unclear";
  anonymity: "accepted" | "limited" | "source_unclear";
  protocolExpectation: "expected" | "source_unclear";
  notes: string;
  protectionOnly: boolean;
  emergencyOnly: boolean;
  automationAllowed: false;
};

/** Public evidence only. No report, student, school or location is interpolated. */
export const COMUN_EDUCATION_INSTITUTIONAL_CHANNEL_CATALOG = [
  {
    id: "vr-sme-official-v1",
    institution: "Secretaria Municipal de Educação de Volta Redonda",
    sphere: "municipal",
    categories: ["public_education"],
    channelType: "web",
    destination: "https://www.smevr.com.br/",
    sourceUrl:
      "https://www.voltaredonda.rj.gov.br/administracao-municipal/administracao-direta/sme-secretaria-municipal-de-educacao/",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "source_unclear",
    confidentiality: "source_unclear",
    anonymity: "source_unclear",
    protocolExpectation: "source_unclear",
    notes:
      "Referência oficial da rede municipal. Forneça dados pessoais apenas diretamente ao canal, se forem necessários; o COMUN não preenche formulários.",
    protectionOnly: false,
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "rj-seeduc-ouverj-v1",
    institution: "SEEDUC-RJ / OuvERJ",
    sphere: "state",
    categories: ["public_education"],
    channelType: "web",
    destination: "https://www.rj.gov.br/ouverj/",
    sourceUrl:
      "https://cge.rj.gov.br/enderecos-horarios-contatos-rede-ouvidorias-transparencia/",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    confidentiality: "available",
    anonymity: "limited",
    protocolExpectation: "expected",
    notes:
      "Canal provável para a rede estadual. O COMUN não abre a página nem transfere texto automaticamente.",
    protectionOnly: false,
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "vr-child-protection-v1",
    institution: "Conselhos Tutelares I e II de Volta Redonda",
    sphere: "protection",
    categories: ["public_education"],
    channelType: "web",
    destination: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/",
    sourceUrl: "https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    confidentiality: "source_unclear",
    anonymity: "source_unclear",
    protocolExpectation: "source_unclear",
    notes:
      "Somente para violação de direitos ou risco envolvendo criança ou adolescente; não é canal genérico para merenda, estrutura ou professor ausente.",
    protectionOnly: true,
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "br-disque-100-v1",
    institution: "Disque Direitos Humanos — Disque 100",
    sphere: "federal",
    categories: ["public_education"],
    channelType: "web",
    destination:
      "https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100",
    sourceUrl:
      "https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    confidentiality: "stated",
    anonymity: "accepted",
    protocolExpectation: "expected",
    notes:
      "Rede de proteção para violações de direitos humanos. O COMUN não liga, não envia e não declara que uma denúncia foi recebida.",
    protectionOnly: true,
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "br-samu-192-education-v1",
    institution: "SAMU 192",
    sphere: "emergency",
    categories: ["public_education"],
    channelType: "phone",
    destination: "192",
    sourceUrl: "https://www.gov.br/saude/pt-br/composicao/saes/samu-192",
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    identificationRequirement: "depends_on_manifestation",
    confidentiality: "stated",
    anonymity: "limited",
    protocolExpectation: "source_unclear",
    notes:
      "Somente para urgência de saúde. O COMUN não faz a chamada nem afirma atendimento em andamento.",
    protectionOnly: true,
    emergencyOnly: true,
    automationAllowed: false,
  },
] as const satisfies readonly ComunEducationInstitutionalChannel[];

export function listComunEducationInstitutionalChannels() {
  return COMUN_EDUCATION_INSTITUTIONAL_CHANNEL_CATALOG.map((channel) => ({
    ...channel,
    categories: [...channel.categories],
  }));
}
