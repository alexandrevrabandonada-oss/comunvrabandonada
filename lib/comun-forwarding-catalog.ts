export const FISCALIZA_VR_CHANNEL = {
  id: "vr-fiscaliza-web",
  name: "Fiscaliza VR",
  type: "web",
  operator: "Prefeitura Municipal de Volta Redonda",
  sphere: "municipal",
  territory: "Volta Redonda",
  officialUrl: "https://www.voltaredonda.rj.gov.br/fiscalizavr",
  state: "source_verified",
  operationalCheck: "public_entry_unavailable_redirect_observed",
  automationAllowed: false,
  reviewedAt: "2026-08-04",
  sourceVersion: "fiscaliza-vr-operational-observation-v1",
  sourceGeneralUrl:
    "https://servicos.voltaredonda.rj.gov.br/cartaServicos/435/",
  sourceSpecificUrl:
    "https://servicos.voltaredonda.rj.gov.br/cartaServicos/158/",
  sourceHistoricalUrl:
    "https://www.voltaredonda.rj.gov.br/cidade/27-noticias-em-destaque/seplag/818-fiscaliza-vr-facilita-atendimento-ao-cidad%C3%A3o/",
} as const;

export const FISCALIZA_LIGHTING_ADAPTER = {
  id: "vr-fiscaliza-lighting-v1",
  channelId: FISCALIZA_VR_CHANNEL.id,
  name: "Fiscaliza VR — manutenção de iluminação pública",
  category: "public_lighting",
  institutionalSubcategory: "iluminacao_e_energia",
  version: "fiscaliza-vr-lighting-v1",
  sourceStatedDuration: 30,
  sourceStatedUnit: "days",
  serviceExpectation:
    "Previsão informada para realização: 30 dias. É uma estimativa de execução do serviço, não prazo legal.",
  generalDeadline: null,
  historicalResponseWindow: {
    value: 48,
    unit: "hours",
    sourceKind: "historical_source",
    operationalStatus: "operational_confirmation_required",
    includedInDueCalculation: false,
  },
  observationState: "public_entry_observed_auth_boundary_pending",
  requirements: [
    {
      key: "location_reference",
      label: "Endereço ou ponto de referência",
      sensitive: false,
    },
    { key: "contact", label: "Uma forma de contato", sensitive: true },
    {
      key: "institutional_text_confirmation",
      label: "Confirmação da mensagem",
      sensitive: false,
    },
  ],
} as const;
