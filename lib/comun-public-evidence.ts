import { createHash } from "node:crypto";
import {
  COMUN_CITY_PANORAMA_ID,
  COMUN_CITY_PANORAMA_METHODOLOGY_VERSION,
  type PanoramaSourceKind,
  type PublicEvidenceClaimKind,
  type PublicEvidenceReferenceV1,
} from "./comun-city-panorama";
import type { PublicProjectionCategory } from "./comun-relata-public-projection";

export const PUBLIC_EVIDENCE_CITATION_CONTRACT =
  "comun.public-evidence-citation.v1" as const;

export type PublicEvidencePanoramaCitationV1 = {
  contractVersion: typeof PUBLIC_EVIDENCE_CITATION_CONTRACT;
  namespace: "comun.panorama";
  refId: string;
  versionId: `sha256:${string}`;
  origin: {
    panoramaId: typeof COMUN_CITY_PANORAMA_ID;
    methodologyVersion: typeof COMUN_CITY_PANORAMA_METHODOLOGY_VERSION;
  };
  observatoryId: string;
  layerId: string;
  claimKind: PublicEvidenceClaimKind;
  title: string;
  publicPath: string;
  sourceKind: PanoramaSourceKind;
  referencePeriod: string;
  sourceRefs: readonly string[];
  limitations: readonly string[];
};

export type PublicEvidenceDenunciasCitationV1 = {
  contractVersion: typeof PUBLIC_EVIDENCE_CITATION_CONTRACT;
  namespace: "comun.denuncias";
  refId: `denuncias:${string}`;
  versionId: `sha256:${string}`;
  claimKind: "community_observation";
  title: string;
  publicPath: `/comun/denuncias/problemas/${string}`;
  sourceKind: "reviewed_community_projection";
  referencePeriod: string;
  sourceRefs: readonly [];
  limitations: readonly string[];
  category: PublicProjectionCategory;
  policyVersion: "relata-public-projection-v1";
  reportCount: number;
  firstObservedDate: string;
  lastActivityDate: string;
  location: {
    label: "área aproximada";
    uncertaintyRadiusMeters: number;
  };
};

export type PublicEvidenceCitationV1 =
  | PublicEvidencePanoramaCitationV1
  | PublicEvidenceDenunciasCitationV1;

const FORBIDDEN_MARKER =
  /(?:original[_ ]?text|receipt|wallet|account[_ ]?id|private[_ ]?location|attachment|forwarding|user[_ ]?id|cpf|e-?mail|phone|contact|report[_ ]?id|case[_ ]?id|collective[_ ]?case[_ ]?id|membership[_ ]?id|exact[_ ]?(?:latitude|longitude)|official[_ ]?protocol|response[_ ]?text|storage|hmac|ciphertext)/i;

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function cleanStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function assertPublicReference(reference: PublicEvidenceReferenceV1) {
  if (!reference.refId.startsWith("panorama:"))
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_NAMESPACE");
  if (!/^\/comun\/observatorios(?:\/|$)/.test(reference.publicPath))
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_PUBLIC_PATH");
  if (reference.publicPath.includes("?") || reference.publicPath.includes("#"))
    throw new Error("COMUN_PUBLIC_EVIDENCE_UNSTABLE_PUBLIC_PATH");
  if (!(["descriptive_fact", "coverage_statement", "data_gap"] as const).includes(reference.claimKind))
    throw new Error("COMUN_PUBLIC_EVIDENCE_FORBIDDEN_CLAIM");
  if (FORBIDDEN_MARKER.test(stableSerialize(reference)))
    throw new Error("COMUN_PUBLIC_EVIDENCE_PRIVATE_FIELD_REJECTED");
}

export function createPublicEvidenceCitationV1(
  reference: PublicEvidenceReferenceV1,
): PublicEvidenceCitationV1 {
  assertPublicReference(reference);
  const semantic = {
    contractVersion: PUBLIC_EVIDENCE_CITATION_CONTRACT,
    namespace: "comun.panorama" as const,
    origin: {
      panoramaId: COMUN_CITY_PANORAMA_ID,
      methodologyVersion: COMUN_CITY_PANORAMA_METHODOLOGY_VERSION,
    },
    refId: reference.refId,
    observatoryId: reference.observatoryId,
    layerId: reference.layerId,
    claimKind: reference.claimKind,
    title: reference.title.trim(),
    publicPath: reference.publicPath,
    sourceKind: reference.sourceKind,
    referencePeriod: reference.referencePeriod.trim(),
    sourceRefs: cleanStrings(reference.sourceRefs),
    limitations: reference.limitations.map((value) => value.trim()).filter(Boolean),
  };
  const digest = createHash("sha256").update(stableSerialize(semantic)).digest("hex");
  return { ...semantic, versionId: `sha256:${digest}` };
}

export type PublicDenunciasEvidenceInput = {
  publicId: string;
  category: PublicProjectionCategory;
  reportCount: number;
  firstObservedDate: string;
  lastActivityDate: string;
  policyVersion: "relata-public-projection-v1";
  location: { uncertaintyRadiusMeters: number };
};

function assertDenunciasEvidenceInput(input: PublicDenunciasEvidenceInput) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input.publicId))
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_REF");
  if (!Number.isSafeInteger(input.reportCount) || input.reportCount < 0)
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_COUNT");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.firstObservedDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.lastActivityDate))
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_PERIOD");
  if (!Number.isFinite(input.location.uncertaintyRadiusMeters) || input.location.uncertaintyRadiusMeters <= 0)
    throw new Error("COMUN_PUBLIC_EVIDENCE_INVALID_PRECISION");
}

export function createDenunciasPublicEvidenceCitationV1(
  input: PublicDenunciasEvidenceInput,
): PublicEvidenceDenunciasCitationV1 {
  assertDenunciasEvidenceInput(input);
  const titles: Record<PublicProjectionCategory, string> = {
    public_lighting: "Iluminação pública no território",
    power_distribution: "Distribuição de energia no território",
    smoke_or_environmental_trace: "Vestígio ambiental no território",
  };
  const semantic = {
    contractVersion: PUBLIC_EVIDENCE_CITATION_CONTRACT,
    namespace: "comun.denuncias" as const,
    refId: `denuncias:${input.publicId}` as `denuncias:${string}`,
    claimKind: "community_observation" as const,
    title: titles[input.category],
    publicPath: `/comun/denuncias/problemas/${input.publicId}` as `/comun/denuncias/problemas/${string}`,
    sourceKind: "reviewed_community_projection" as const,
    referencePeriod: `${input.firstObservedDate} a ${input.lastActivityDate}`,
    sourceRefs: [] as const,
    limitations: [
      "Área aproximada; não mostramos endereço, texto original ou quem relatou.",
      "A contagem considera somente relatos públicos elegíveis.",
    ],
    category: input.category,
    policyVersion: input.policyVersion,
    reportCount: input.reportCount,
    firstObservedDate: input.firstObservedDate,
    lastActivityDate: input.lastActivityDate,
    location: {
      label: "área aproximada" as const,
      uncertaintyRadiusMeters: Math.ceil(input.location.uncertaintyRadiusMeters),
    },
  };
  const digest = createHash("sha256").update(stableSerialize(semantic)).digest("hex");
  return { ...semantic, versionId: `sha256:${digest}` };
}

export function isPublicEvidenceCitationV1(
  value: unknown,
): value is PublicEvidenceCitationV1 {
  if (!value || typeof value !== "object") return false;
  if (FORBIDDEN_MARKER.test(stableSerialize(value))) return false;
  const item = value as Partial<PublicEvidenceCitationV1> & { namespace?: string };
  if (item.namespace === "comun.denuncias") {
    const candidate = value as Partial<PublicEvidenceDenunciasCitationV1>;
    if (
      candidate.contractVersion !== PUBLIC_EVIDENCE_CITATION_CONTRACT ||
      typeof candidate.refId !== "string" ||
      !/^denuncias:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(candidate.refId) ||
      candidate.claimKind !== "community_observation" ||
      candidate.sourceKind !== "reviewed_community_projection" ||
      typeof candidate.publicPath !== "string" ||
      !/^\/comun\/denuncias\/problemas\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(candidate.publicPath) ||
      candidate.publicPath !== `/comun/denuncias/problemas/${candidate.refId.slice("denuncias:".length)}` ||
      candidate.policyVersion !== "relata-public-projection-v1" ||
      !Array.isArray(candidate.sourceRefs) || candidate.sourceRefs.length !== 0 ||
      !Array.isArray(candidate.limitations) ||
      !candidate.location || candidate.location.label !== "área aproximada" ||
      typeof candidate.reportCount !== "number" || !Number.isSafeInteger(candidate.reportCount) || candidate.reportCount < 0 ||
      typeof candidate.category !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(candidate.firstObservedDate ?? "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(candidate.lastActivityDate ?? "")
    ) return false;
    try {
      const reconstructed = createDenunciasPublicEvidenceCitationV1({
        publicId: candidate.refId!.slice("denuncias:".length),
        category: candidate.category!,
        reportCount: candidate.reportCount!,
        firstObservedDate: candidate.firstObservedDate!,
        lastActivityDate: candidate.lastActivityDate!,
        policyVersion: candidate.policyVersion!,
        location: { uncertaintyRadiusMeters: candidate.location.uncertaintyRadiusMeters! },
      });
      return reconstructed.versionId === candidate.versionId;
    } catch { return false; }
  }
  if (item.namespace !== "comun.panorama") return false;
  const shapeIsValid = (
    item.contractVersion === PUBLIC_EVIDENCE_CITATION_CONTRACT &&
    item.namespace === "comun.panorama" &&
    typeof item.refId === "string" &&
    typeof item.versionId === "string" &&
    /^sha256:[0-9a-f]{64}$/.test(item.versionId) &&
    typeof item.publicPath === "string" &&
    /^\/comun\/observatorios(?:\/|$)/.test(item.publicPath) &&
    item.origin?.panoramaId === COMUN_CITY_PANORAMA_ID &&
    item.origin?.methodologyVersion === COMUN_CITY_PANORAMA_METHODOLOGY_VERSION &&
    Array.isArray(item.sourceRefs) &&
    Array.isArray(item.limitations)
  );
  if (!shapeIsValid) return false;
  try {
    const reconstructed = createPublicEvidenceCitationV1({
      refId: item.refId!,
      observatoryId: item.observatoryId!,
      layerId: item.layerId!,
      claimKind: item.claimKind!,
      title: item.title!,
      publicPath: item.publicPath!,
      sourceKind: item.sourceKind!,
      referencePeriod: item.referencePeriod!,
      sourceRefs: item.sourceRefs!,
      limitations: item.limitations!,
    });
    return reconstructed.versionId === item.versionId;
  } catch {
    return false;
  }
}
