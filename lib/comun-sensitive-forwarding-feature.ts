import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";
import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_SENSITIVE_FORWARDING_ASSISTED_FLAG =
  "COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED" as const;
export const COMUN_CHILD_PROTECTION_CHANNEL_ONLY_FLAG =
  "COMUN_CHILD_PROTECTION_CHANNEL_ONLY_ENABLED" as const;

export const SENSITIVE_FORWARDING_CATEGORIES = [
  "public_health",
  "public_education",
  "child_protection",
] as const;

export type SensitiveForwardingCategory =
  (typeof SENSITIVE_FORWARDING_CATEGORIES)[number];
export type SensitiveDisclosurePolicy =
  | "health_minimal_v1"
  | "education_minimal_v1"
  | "child_protection_channel_only_v1";

export type SensitiveDisclosureInput = {
  includeIssueType: boolean;
  includeUnitLabel: boolean;
  unitLabel: string;
  includeNetworkLabel: boolean;
  networkLabel: string;
  includeApproximatePeriod: boolean;
  approximatePeriod: string;
  includePersonAuthoredSummary: boolean;
  personAuthoredSummary: string;
};

export function isSensitiveForwardingCategory(
  value: unknown,
): value is SensitiveForwardingCategory {
  return (
    typeof value === "string" &&
    (SENSITIVE_FORWARDING_CATEGORIES as readonly string[]).includes(value)
  );
}

export function sensitiveDisclosurePolicyFor(
  category: SensitiveForwardingCategory,
): SensitiveDisclosurePolicy {
  if (category === "public_health") return "health_minimal_v1";
  if (category === "public_education") return "education_minimal_v1";
  return "child_protection_channel_only_v1";
}

export function isComunSensitiveForwardingAssistedEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SENSITIVE_FORWARDING_ASSISTED_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env) &&
    isComunParticipationWalletEnabled(env) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function isComunChildProtectionChannelOnlyEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_CHILD_PROTECTION_CHANNEL_ONLY_FLAG] === "enabled" &&
    isComunSensitiveForwardingAssistedEnabled(env)
  );
}

export function canUseSensitiveForwarding(
  category: SensitiveForwardingCategory,
  env: Record<string, string | undefined> = process.env,
) {
  if (!isComunSensitiveForwardingAssistedEnabled(env)) return false;
  return (
    category !== "child_protection" ||
    isComunChildProtectionChannelOnlyEnabled(env)
  );
}

const EMAIL = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i;
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
const PHONE = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}/;
const DOCUMENT_HINT = /\b(?:cpf|rg|cart[aã]o\s*sus|prontu[aá]rio|matr[ií]cula)\b/i;

export function sensitiveDisclosureWarnings(value: string) {
  const warnings: string[] = [];
  if (EMAIL.test(value)) warnings.push("email");
  if (CPF.test(value)) warnings.push("document");
  if (PHONE.test(value)) warnings.push("phone");
  if (DOCUMENT_HINT.test(value)) warnings.push("sensitive_identifier");
  return [...new Set(warnings)];
}

export function validateSensitiveDisclosureInput(
  category: SensitiveForwardingCategory,
  input: SensitiveDisclosureInput,
) {
  const unitLabel = input.unitLabel.trim();
  const networkLabel = input.networkLabel.trim();
  const approximatePeriod = input.approximatePeriod.trim();
  const personAuthoredSummary = input.personAuthoredSummary.trim();
  if (
    unitLabel.length > 120 ||
    networkLabel.length > 40 ||
    approximatePeriod.length > 80 ||
    personAuthoredSummary.length > 1000
  )
    return { ok: false as const, code: "invalid_length" };
  if (
    (input.includeUnitLabel && !unitLabel) ||
    (input.includeNetworkLabel && !networkLabel) ||
    (input.includeApproximatePeriod && !approximatePeriod) ||
    (input.includePersonAuthoredSummary && !personAuthoredSummary)
  )
    return { ok: false as const, code: "missing_selected_value" };
  if (
    category === "child_protection" &&
    (input.includeIssueType ||
      input.includeUnitLabel ||
      input.includeNetworkLabel ||
      input.includeApproximatePeriod ||
      input.includePersonAuthoredSummary ||
      unitLabel ||
      networkLabel ||
      approximatePeriod ||
      personAuthoredSummary)
  )
    return { ok: false as const, code: "channel_only" };
  const warnings = sensitiveDisclosureWarnings(
    [unitLabel, networkLabel, approximatePeriod, personAuthoredSummary].join(" "),
  );
  if (warnings.length)
    return { ok: false as const, code: "review_sensitive_information", warnings };
  return {
    ok: true as const,
    value: { unitLabel, networkLabel, approximatePeriod, personAuthoredSummary },
  };
}
