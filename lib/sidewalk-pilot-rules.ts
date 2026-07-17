export const SIDEWALK_CATEGORIES = [
  "buraco",
  "calcada_irregular",
  "ausencia_rampa",
  "rampa_inadequada",
  "piso_liso",
  "obstaculo",
  "passeio_interrompido",
  "sinalizacao_ausente",
  "vegetacao",
  "outro",
] as const;

export type SidewalkCategory = (typeof SIDEWALK_CATEGORIES)[number];

export const IMPACT_LEVELS = ["low", "medium", "high", "critical"] as const;
export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const AFFECTED_GROUPS = [
  "wheelchair_users",
  "visually_impaired",
  "elderly",
  "children",
  "pregnant",
  "strollers",
  "temporary_mobility",
  "general_public",
] as const;

export type AffectedGroup = (typeof AFFECTED_GROUPS)[number];

export const SIDEWALK_STATUS = [
  "pending",
  "under_review",
  "verified",
  "published",
  "rejected",
  "archived",
  "resolved",
  "withdrawn",
] as const;

export type SidewalkStatus = (typeof SIDEWALK_STATUS)[number];

export function validateSidewalkCategory(value: string): value is SidewalkCategory {
  return SIDEWALK_CATEGORIES.includes(value as SidewalkCategory);
}

export function validateImpactLevel(value: string): value is ImpactLevel {
  return IMPACT_LEVELS.includes(value as ImpactLevel);
}

export function validateAffectedGroups(groups: string[]): groups is AffectedGroup[] {
  return groups.length > 0 && groups.every((g) => AFFECTED_GROUPS.includes(g as AffectedGroup));
}

export function validateSidewalkStatus(value: string): value is SidewalkStatus {
  return SIDEWALK_STATUS.includes(value as SidewalkStatus);
}

export function validateSafeGeoJson(geo: unknown): { ok: true } | { ok: false; error: string } {
  if (!geo || typeof geo !== "object" || Array.isArray(geo)) {
    return { ok: false, error: "GeoJSON deve ser objeto." };
  }
  const g = geo as Record<string, unknown>;
  if (!["Point", "LineString"].includes(g.type as string)) {
    return { ok: false, error: "Tipo deve ser Point ou LineString." };
  }
  if (g.properties !== undefined && Object.keys(g.properties as object).length > 0) {
    return { ok: false, error: "Propriedades privadas não permitidas." };
  }
  const coords = g.coordinates;
  if (!Array.isArray(coords)) {
    return { ok: false, error: "Coordinates ausente." };
  }
  if (g.type === "Point") {
    if (
      coords.length !== 2 ||
      typeof coords[0] !== "number" ||
      typeof coords[1] !== "number" ||
      Math.abs(coords[0]) > 180 ||
      Math.abs(coords[1]) > 90
    ) {
      return { ok: false, error: "Point inválido." };
    }
  }
  if (g.type === "LineString") {
    if (!coords.every((c) => Array.isArray(c) && c.length === 2 && typeof c[0] === "number" && typeof c[1] === "number")) {
      return { ok: false, error: "LineString inválido." };
    }
  }
  return { ok: true };
}

export function publicLocation(input: {
  latitude?: number | null;
  longitude?: number | null;
  location_precision?: string | null;
  private_location?: string | null;
}):
  | { latitude: number; longitude: number; precision: "exact" | "approximate" | "hidden" }
  | null {
  if (input.location_precision === "hidden") return null;
  if (typeof input.latitude !== "number" || typeof input.longitude !== "number") return null;
  return {
    latitude: Math.round(input.latitude * 1000) / 1000,
    longitude: Math.round(input.longitude * 1000) / 1000,
    precision: (input.location_precision as "exact" | "approximate" | "hidden") ?? "approximate",
  };
}

export function classifyReview(input: {
  status: string;
  verification_status: string;
  editorial_review_status?: string;
}): "pending" | "verified" | "published" | "rejected" {
  if (input.status === "rejected" || input.editorial_review_status === "changes_required") return "rejected";
  if (input.status === "published" && input.verification_status === "verified") return "published";
  if (input.verification_status === "verified") return "verified";
  return "pending";
}

export function suggestDuplicate(hashA: string, hashB: string): boolean {
  return hashA.length > 0 && hashA === hashB;
}

export function coverageWarning(total: number, expectedMinimum = 3): string | null {
  if (total < expectedMinimum) return `Cobertura insuficiente: ${total} de ${expectedMinimum} registros.`;
  return null;
}

export function isProtocolStatusTerminal(status: string): boolean {
  return ["resolved", "unresolved", "archived"].includes(status);
}

const SENSITIVE_PROTOCOL_KEYS = new Set([
  "private_contact",
  "raw_text",
  "internal_notes",
  "object_key",
  "auth_user_id",
  "original_url",
  "signed_url",
]);

export function sanitizeProtocolPackage(input: Record<string, unknown>): Record<string, unknown> {
  return sanitizeRecursively(input, SENSITIVE_PROTOCOL_KEYS) as Record<string, unknown>;
}

export function isFixtureResponse(response: { is_fixture?: boolean; source?: string }): boolean {
  return response.is_fixture === true || response.source === "fixture";
}

export function validateResultEvidence(result: {
  evidence_required: boolean;
  evidence_count?: number;
  evidence_fixture_ids?: string[];
}): { ok: true } | { ok: false; error: string } {
  if (!result.evidence_required) return { ok: true };
  const count = result.evidence_count ?? result.evidence_fixture_ids?.length ?? 0;
  if (count === 0) return { ok: false, error: "Resultado exige evidência." };
  return { ok: true };
}

export function sanitizeObservationPayload(input: Record<string, unknown>): Record<string, unknown> {
  return sanitizeRecursively(input, new Set([
    "private_contact",
    "internal_notes",
    "raw_details_private",
    "attachment_private_reference",
  ])) as Record<string, unknown>;
}

function sanitizeRecursively(value: unknown, sensitiveKeys: Set<string>): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeRecursively(item, sensitiveKeys));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (sensitiveKeys.has(key)) continue;
    output[key] = sanitizeRecursively(child, sensitiveKeys);
  }
  return output;
}
