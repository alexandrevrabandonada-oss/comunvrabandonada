export type ComunChildProtectionChannel = {
  id: string;
  institution: string;
  territory: "volta_redonda" | "rio_de_janeiro" | "brazil";
  purpose:
    "protection" | "rights_report" | "police_emergency" | "medical_emergency";
  channelType: "phone";
  destination: string | null;
  sourceUrls: readonly string[];
  reviewedAt: "2026-08-10";
  sourceStatus: "source_verified" | "source_conflict";
  operationalStatus: "operationally_unchecked";
  anonymity: "accepted" | "source_unclear";
  confidentiality: "stated" | "source_unclear";
  identificationRequirement: "not_required" | "source_unclear";
  protocolExpectation: "expected" | "source_unclear";
  hours: string | null;
  notes: string;
  emergencyOnly: boolean;
  automationAllowed: false;
};

const CHANNELS: readonly ComunChildProtectionChannel[] = [
  {
    id: "vr-conselho-tutelar-source-conflict-v1",
    institution: "Conselho Tutelar de Volta Redonda",
    territory: "volta_redonda",
    purpose: "protection",
    channelType: "phone",
    destination: null,
    sourceUrls: [
      "https://conselhos.voltaredonda.rj.gov.br/conselhos/conselho-tutelar-do-municipio-de-volta-redonda-ct-i-e-ii",
      "https://servicos.voltaredonda.rj.gov.br/cartaServicos/21/",
    ],
    reviewedAt: "2026-08-10",
    sourceStatus: "source_conflict",
    operationalStatus: "operationally_unchecked",
    anonymity: "source_unclear",
    confidentiality: "source_unclear",
    identificationRequirement: "source_unclear",
    protocolExpectation: "source_unclear",
    hours: null,
    notes:
      "Duas fontes oficiais municipais publicam contatos diferentes. Consulte as fontes oficiais; o COMUN não escolhe um número silenciosamente.",
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "br-disque-100-child-protection-v1",
    institution: "Disque Direitos Humanos — Disque 100",
    territory: "brazil",
    purpose: "rights_report",
    channelType: "phone",
    destination: "100",
    sourceUrls: [
      "https://www.gov.br/mdh/pt-br/acesso-a-informacao/disque-100/disque-100",
    ],
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    anonymity: "accepted",
    confidentiality: "stated",
    identificationRequirement: "not_required",
    protocolExpectation: "expected",
    hours: "24 horas, todos os dias",
    notes:
      "Canal nacional gratuito. A fonte oficial informa anonimato e protocolo; o COMUN não testou a operação nem realizou contato.",
    emergencyOnly: false,
    automationAllowed: false,
  },
  {
    id: "rj-pmerj-190-child-emergency-v1",
    institution: "Polícia Militar do Estado do Rio de Janeiro — 190",
    territory: "rio_de_janeiro",
    purpose: "police_emergency",
    channelType: "phone",
    destination: "190",
    sourceUrls: ["https://sepm.rj.gov.br/fale-conosco/"],
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    anonymity: "source_unclear",
    confidentiality: "source_unclear",
    identificationRequirement: "source_unclear",
    protocolExpectation: "source_unclear",
    hours: "24 horas",
    notes:
      "Referência de emergência. O COMUN não liga, não envia localização e não informa que o serviço foi acionado.",
    emergencyOnly: true,
    automationAllowed: false,
  },
  {
    id: "br-samu-192-child-emergency-v1",
    institution: "SAMU 192",
    territory: "brazil",
    purpose: "medical_emergency",
    channelType: "phone",
    destination: "192",
    sourceUrls: ["https://www.gov.br/saude/pt-br/composicao/saes/samu-192"],
    reviewedAt: "2026-08-10",
    sourceStatus: "source_verified",
    operationalStatus: "operationally_unchecked",
    anonymity: "source_unclear",
    confidentiality: "source_unclear",
    identificationRequirement: "source_unclear",
    protocolExpectation: "source_unclear",
    hours: "24 horas, todos os dias",
    notes:
      "Referência para urgência médica. O COMUN não liga, não envia dados e não substitui a avaliação do serviço.",
    emergencyOnly: true,
    automationAllowed: false,
  },
];

export function listComunChildProtectionChannels() {
  return CHANNELS.map((channel) => ({
    ...channel,
    sourceUrls: [...channel.sourceUrls],
  }));
}
