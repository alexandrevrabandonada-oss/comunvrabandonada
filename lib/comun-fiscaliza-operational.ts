import { FISCALIZA_VR_CHANNEL } from "./comun-forwarding-catalog";

export const FISCALIZA_OPERATIONAL_STATES = [
  "source_verified",
  "public_entry_reachable",
  "authentication_boundary_observed",
  "service_category_observed",
  "form_fields_observed",
  "review_boundary_observed",
  "submission_boundary_observed",
  "protocol_behavior_unconfirmed",
  "operationally_observed_no_submission",
  "degraded",
  "unavailable",
] as const;

export type FiscalizaOperationalState =
  (typeof FISCALIZA_OPERATIONAL_STATES)[number];

export const FISCALIZA_SOURCE_RECONCILIATION = {
  general: {
    url: FISCALIZA_VR_CHANNEL.sourceGeneralUrl,
    sourceKind: "current_general",
    deadline: null,
    deadlineNature: "not_stated",
    includedInDueCalculation: false,
    claims: ["ininterrupto", "cadastro_atual", "protocolo_esperado", "acompanhamento_esperado"],
  },
  lighting: {
    url: FISCALIZA_VR_CHANNEL.sourceSpecificUrl,
    sourceKind: "current_specific_service",
    deadline: { value: 30, unit: "days" },
    deadlineNature: "service_realization_estimate",
    includedInDueCalculation: true,
    claims: ["Secretaria Municipal de Infraestrutura", "nome_e_contato", "rua_numero_referencia"],
  },
  historical2019: {
    url: FISCALIZA_VR_CHANNEL.sourceHistoricalUrl,
    sourceKind: "historical_source",
    deadline: { value: 48, unit: "hours" },
    deadlineNature: "historical_initial_response_window",
    operationalStatus: "operational_confirmation_required",
    includedInDueCalculation: false,
    claims: ["anonimato_historico_nao_promovido", "perfil", "acompanhamento", "notificacoes"],
  },
} as const;

export const FISCALIZA_ASSISTED_OPENING_URL =
  "https://www.voltaredonda.rj.gov.br/fiscalizavr";

export function validateFiscalizaDestination(raw: string) {
  try {
    const url = new URL(raw);
    const allowed = new URL(FISCALIZA_ASSISTED_OPENING_URL);
    return {
      valid:
        url.protocol === "https:" &&
        url.hostname === allowed.hostname &&
        url.pathname === allowed.pathname &&
        !url.search &&
        !url.hash,
      reason:
        url.protocol !== "https:"
          ? "https_required"
          : url.hostname !== allowed.hostname
            ? "unexpected_host"
            : url.pathname !== allowed.pathname
              ? "unexpected_path"
              : url.search || url.hash
                ? "dynamic_url_not_allowed"
                : null,
      url: url.toString(),
    };
  } catch {
    return { valid: false, reason: "invalid_url", url: raw };
  }
}

