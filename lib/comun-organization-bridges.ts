import "server-only";

import type { PublicEvidenceReferenceV1 } from "./comun-city-panorama";
import {
  createPublicEvidenceCitationV1,
  isPublicEvidenceCitationV1,
  type PublicEvidenceCitationV1,
} from "./comun-public-evidence";
import { resolveCurrentPublicEvidenceReference } from "./comun-public-evidence-resolver";
import {
  createPublicSupabaseClient,
  createServiceSupabaseClient,
} from "./supabase/server";

export type PublicOrganizationBridgePautaV1 = {
  pautaId: string;
  slug: string;
  title: string;
  summary: string | null;
  publicStatus: string;
  nextStep: string | null;
  linkedEvidenceVersion: `sha256:${string}`;
  relationVersionState: "current_version" | "historical_version";
};

export type PublicOrganizationBridgeV1 = {
  evidenceRefId: string;
  currentEvidenceVersion: `sha256:${string}`;
  pautas: readonly PublicOrganizationBridgePautaV1[];
};

export type PublicOrganizationBridgeFilterV1 = {
  citation: PublicEvidenceCitationV1;
  bridge: PublicOrganizationBridgeV1;
};

export type RawPublicOrganizationBridgeRow = {
  source_type?: unknown;
  status?: unknown;
  sensitivity?: unknown;
  public_evidence_ref_id?: unknown;
  public_evidence_version?: unknown;
  public_evidence_payload?: unknown;
  pauta?: unknown;
};

export function publicOrganizationBridgeHref(
  bridge: PublicOrganizationBridgeV1 | undefined,
) {
  if (!bridge?.pautas.length) return null;
  if (bridge.pautas.length === 1) {
    return `/comun/pautas/${bridge.pautas[0].slug}`;
  }
  return `/comun/pautas?evidencia=${encodeURIComponent(bridge.evidenceRefId)}`;
}

type RawPublicPauta = {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  public_status?: unknown;
  next_step?: unknown;
  status?: unknown;
  visibility?: unknown;
  updated_at?: unknown;
};

type ProjectedPauta = PublicOrganizationBridgePautaV1 & {
  updatedAt: string;
};

const PUBLIC_TEXT_MAX_LENGTH = 4_000;
const PUBLIC_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VERSION_ID = /^sha256:[0-9a-f]{64}$/;

function cleanPublicText(value: unknown, maxLength = PUBLIC_TEXT_MAX_LENGTH) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function readPauta(value: unknown): RawPublicPauta | null {
  if (Array.isArray(value)) {
    return value.length === 1 && value[0] && typeof value[0] === "object"
      ? (value[0] as RawPublicPauta)
      : null;
  }
  return value && typeof value === "object" ? (value as RawPublicPauta) : null;
}

function projectPauta(
  row: RawPublicOrganizationBridgeRow,
  current: PublicEvidenceCitationV1,
): ProjectedPauta | null {
  if (
    row.source_type !== "public_evidence" ||
    row.status !== "approved" ||
    row.sensitivity !== "public_safe" ||
    row.public_evidence_ref_id !== current.refId ||
    typeof row.public_evidence_version !== "string" ||
    !VERSION_ID.test(row.public_evidence_version) ||
    !isPublicEvidenceCitationV1(row.public_evidence_payload)
  ) {
    return null;
  }
  const persistedCitation = row.public_evidence_payload;
  if (
    persistedCitation.refId !== row.public_evidence_ref_id ||
    persistedCitation.versionId !== row.public_evidence_version
  ) {
    return null;
  }
  const pauta = readPauta(row.pauta);
  const pautaId = cleanPublicText(pauta?.id, 120);
  const slug = cleanPublicText(pauta?.slug, 100);
  const title = cleanPublicText(pauta?.title, 240);
  if (
    !pautaId ||
    !slug ||
    !PUBLIC_SLUG.test(slug) ||
    !title ||
    pauta?.visibility !== "public" ||
    pauta?.status === "archived"
  ) {
    return null;
  }
  return {
    pautaId,
    slug,
    title,
    summary: cleanPublicText(pauta?.summary),
    publicStatus:
      cleanPublicText(pauta?.public_status, 120) ?? "Pauta pública",
    nextStep: cleanPublicText(pauta?.next_step),
    linkedEvidenceVersion: row.public_evidence_version as `sha256:${string}`,
    relationVersionState:
      row.public_evidence_version === current.versionId
        ? "current_version"
        : "historical_version",
    updatedAt:
      typeof pauta?.updated_at === "string" &&
      Number.isFinite(Date.parse(pauta.updated_at))
        ? pauta.updated_at
        : "",
  };
}

export function projectPublicOrganizationBridges(
  citations: readonly PublicEvidenceCitationV1[],
  rows: readonly RawPublicOrganizationBridgeRow[],
): PublicOrganizationBridgeV1[] {
  const currentByRef = new Map(
    citations
      .filter(isPublicEvidenceCitationV1)
      .map((citation) => [citation.refId, citation] as const),
  );
  const pautasByRef = new Map<string, Map<string, ProjectedPauta>>();

  for (const row of rows) {
    const refId =
      typeof row.public_evidence_ref_id === "string"
        ? row.public_evidence_ref_id
        : "";
    const current = currentByRef.get(refId);
    if (!current) continue;
    const projected = projectPauta(row, current);
    if (!projected) continue;
    const byPauta = pautasByRef.get(refId) ?? new Map<string, ProjectedPauta>();
    const existing = byPauta.get(projected.pautaId);
    if (
      !existing ||
      (existing.relationVersionState === "historical_version" &&
        projected.relationVersionState === "current_version") ||
      (existing.relationVersionState === projected.relationVersionState &&
        projected.linkedEvidenceVersion > existing.linkedEvidenceVersion)
    ) {
      byPauta.set(projected.pautaId, projected);
    }
    pautasByRef.set(refId, byPauta);
  }

  return [...currentByRef.values()].map((citation) => ({
    evidenceRefId: citation.refId,
    currentEvidenceVersion: citation.versionId,
    pautas: [...(pautasByRef.get(citation.refId)?.values() ?? [])]
      .sort(
        (left, right) =>
          Date.parse(right.updatedAt || "1970-01-01") -
            Date.parse(left.updatedAt || "1970-01-01") ||
          left.slug.localeCompare(right.slug, "pt-BR"),
      )
      .map(({ updatedAt: _updatedAt, ...pauta }) => pauta),
  }));
}

function citationsFromReferences(
  references: readonly PublicEvidenceReferenceV1[],
) {
  return references.flatMap((reference) => {
    try {
      return [createPublicEvidenceCitationV1(reference)];
    } catch {
      return [];
    }
  });
}

export async function listPublicOrganizationBridgesForReferences(
  references: readonly PublicEvidenceReferenceV1[],
): Promise<PublicOrganizationBridgeV1[]> {
  return listPublicOrganizationBridgesForCitations(
    citationsFromReferences(references),
  );
}

export async function listPublicOrganizationBridgesForCitations(
  citations: readonly PublicEvidenceCitationV1[],
): Promise<PublicOrganizationBridgeV1[]> {
  const validCitations = citations.filter(isPublicEvidenceCitationV1);
  if (!validCitations.length) return [];
  const refs = [...new Set(validCitations.map((citation) => citation.refId))];
  const supabase =
    createPublicSupabaseClient() ?? createServiceSupabaseClient();
  if (!supabase) return projectPublicOrganizationBridges(validCitations, []);

  const { data, error } = await supabase
    .from("comun_pauta_evidence_items")
    .select(
      "source_type,status,sensitivity,public_evidence_ref_id,public_evidence_version,public_evidence_payload,pauta:comun_pauta_spaces!inner(id,slug,title,summary,public_status,next_step,status,visibility,updated_at)",
    )
    .eq("source_type", "public_evidence")
    .eq("status", "approved")
    .eq("sensitivity", "public_safe")
    .in("public_evidence_ref_id", refs)
    .eq("pauta.visibility", "public")
    .neq("pauta.status", "archived")
    .order("updated_at", { ascending: false, referencedTable: "pauta" });

  if (error || !data) {
    console.error("COMUN_48_3_E2_PUBLIC_BRIDGE_QUERY_UNAVAILABLE");
    return projectPublicOrganizationBridges(validCitations, []);
  }
  return projectPublicOrganizationBridges(
    validCitations,
    data as unknown as RawPublicOrganizationBridgeRow[],
  );
}

export async function resolvePublicOrganizationBridgeFilter(
  refId: string,
): Promise<PublicOrganizationBridgeFilterV1 | null> {
  const citation = await resolveCurrentPublicEvidenceReference(refId);
  if (!citation) return null;
  const [bridge] = await listPublicOrganizationBridgesForCitations([citation]);
  return bridge ? { citation, bridge } : null;
}
