export const STMU_OFFICIAL_EMAIL = "stmu@voltaredonda.rj.gov.br" as const;
export const STMU_FIELD_EMAIL_CANDIDATE =
  "ouvidoria.onibusvr@gmail.com" as const;
export const STMU_PHONE = "+552435113728" as const;

export const STMU_EMAIL_CHANNEL = {
  id: "vr-stmu-official-email",
  adapterId: "vr-stmu-official-email-complaint-v1",
  destination: `mailto:${STMU_OFFICIAL_EMAIL}`,
  state: "source_verified_not_tested",
  responseExpectation:
    "A página atual da STMU informa expectativa de retorno em 72 horas; não é prazo legal e não foi confirmada no e-mail.",
} as const;

export const STMU_FIELD_EMAIL = {
  id: "vr-stmu-field-ombudsman-email-candidate",
  adapterId: "vr-stmu-field-ombudsman-email-candidate",
  destination: `mailto:${STMU_FIELD_EMAIL_CANDIDATE}`,
  state: "candidate_unverified_blocked",
} as const;

export function validateStmuEmailDestination(raw: string) {
  return raw === STMU_EMAIL_CHANNEL.destination;
}

export const STMU_ATTEMPT_STATES = [
  "prepared",
  "opened_by_person",
  "person_declared_sent",
  "acknowledgement_pending",
  "acknowledged",
  "protocol_pending",
  "protocol_recorded",
  "human_response_pending",
  "human_response_recorded",
  "resolved",
  "no_response",
  "bounced",
  "channel_unavailable",
  "abandoned",
  "superseded_by_next_attempt",
] as const;

export function latencyBucket(hours: number) {
  if (hours < 1) return "less_than_1_hour";
  if (hours < 6) return "1_to_6_hours";
  if (hours < 24) return "6_to_24_hours";
  if (hours < 72) return "1_to_3_days";
  if (hours < 168) return "4_to_7_days";
  return "more_than_7_days";
}
