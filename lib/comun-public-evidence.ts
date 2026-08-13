import { createHash } from "node:crypto";
import {
  COMUN_CITY_PANORAMA_ID,
  COMUN_CITY_PANORAMA_METHODOLOGY_VERSION,
  type PanoramaSourceKind,
  type PublicEvidenceClaimKind,
  type PublicEvidenceReferenceV1,
} from "./comun-city-panorama";

export const PUBLIC_EVIDENCE_CITATION_CONTRACT =
  "comun.public-evidence-citation.v1" as const;

export type PublicEvidenceCitationV1 = {
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

const FORBIDDEN_MARKER =
  /(?:original[_ ]?text|receipt|wallet|account[_ ]?id|private[_ ]?location|attachment|forwarding|user[_ ]?id|cpf|e-?mail|report[_ ]?id|case[_ ]?id)/i;

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

export function isPublicEvidenceCitationV1(
  value: unknown,
): value is PublicEvidenceCitationV1 {
  if (!value || typeof value !== "object") return false;
  if (FORBIDDEN_MARKER.test(stableSerialize(value))) return false;
  const item = value as Partial<PublicEvidenceCitationV1>;
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
