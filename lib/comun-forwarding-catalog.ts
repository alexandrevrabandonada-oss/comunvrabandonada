export const FISCALIZA_VR_CHANNEL = {
  id: "vr-fiscaliza-web",
  name: "Fiscaliza VR",
  type: "web",
  operator: "Prefeitura Municipal de Volta Redonda",
  sphere: "municipal",
  territory: "Volta Redonda",
  officialUrl: "https://www.voltaredonda.rj.gov.br/fiscalizavr",
  state: "source_verified",
  operationalCheck: "pending",
  automationAllowed: false,
  reviewedAt: "2026-08-04",
  sourceVersion: "relata-channel-catalog-v1",
} as const;

export const FISCALIZA_LIGHTING_ADAPTER = {
  id: "vr-fiscaliza-lighting-v1",
  channelId: FISCALIZA_VR_CHANNEL.id,
  name: "Fiscaliza VR — manutenção de iluminação pública",
  category: "public_lighting",
  institutionalSubcategory: "iluminacao_e_energia",
  version: "fiscaliza-vr-lighting-v1",
  sourceStatedDuration: 48,
  sourceStatedUnit: "hours",
  serviceExpectation:
    "Resposta inicial informada pela fonte municipal; não é prazo legal.",
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
