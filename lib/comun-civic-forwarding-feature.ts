import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";
import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const CIVIC_ASSISTED_CATEGORIES = [
  "waste_or_debris",
  "smoke_or_environmental_trace",
  "environmental_pollution",
  "stormwater_drainage",
  "urban_flooding",
  "tree_hazard",
] as const;

export type CivicAssistedCategory = (typeof CIVIC_ASSISTED_CATEGORIES)[number];

export function isCivicAssistedCategory(
  value: unknown,
): value is CivicAssistedCategory {
  return (
    typeof value === "string" &&
    (CIVIC_ASSISTED_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isCivicEmergencyContext(input: {
  category: string;
  urgency?: string | null;
  immediateDanger?: boolean;
  smokeActive?: boolean;
  floodActiveRisk?: boolean;
  treeFallState?: string | null;
}) {
  return (
    ["urgent", "emergency"].includes(String(input.urgency ?? "")) ||
    input.immediateDanger === true ||
    input.smokeActive === true ||
    input.floodActiveRisk === true ||
    input.treeFallState === "falling"
  );
}

export function isComunCivicForwardingAssistedEnabled(
  category: unknown,
  env: Record<string, string | undefined> = process.env,
) {
  if (
    !isCivicAssistedCategory(category) ||
    !isComunRelataPersistenceEnabled(env) ||
    !isComunParticipationWalletEnabled(env) ||
    !env.SUPABASE_SERVICE_ROLE_KEY
  )
    return false;

  const environmental = [
    "waste_or_debris",
    "smoke_or_environmental_trace",
    "environmental_pollution",
  ].includes(category);
  const urban = ["stormwater_drainage", "urban_flooding", "tree_hazard"].includes(
    category,
  );
  return (
    (environmental &&
      env.COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED === "enabled") ||
    (urban && env.COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_ENABLED === "enabled")
  );
}

const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const PHONE = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/;

export function validateCivicForwardingInput(input: {
  publicReference: string;
  personAuthoredSummary: string;
}) {
  const publicReference = input.publicReference.trim();
  const personAuthoredSummary = input.personAuthoredSummary.trim();
  if (publicReference.length < 3 || publicReference.length > 160)
    return { ok: false as const, code: "public_reference_required" };
  if (
    personAuthoredSummary.length < 8 ||
    personAuthoredSummary.length > 1000
  )
    return { ok: false as const, code: "summary_required" };
  if (
    [publicReference, personAuthoredSummary].some(
      (value) => EMAIL.test(value) || CPF.test(value) || PHONE.test(value),
    )
  )
    return { ok: false as const, code: "private_data_not_allowed" };
  return { ok: true as const, value: { publicReference, personAuthoredSummary } };
}

