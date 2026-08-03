import type {
  Consent,
  Protocol,
  RelataInput,
  RoutingDecision,
  Submission,
} from "./comun-relata-contract";
import {
  classifyRelataPrivacy,
  sanitizeRelataSummary,
} from "./comun-relata-privacy";

function opaqueId(prefix: string) {
  const seed = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${seed}`;
}

export function createLocalRelataProtocol(): Protocol {
  return {
    value: `COMUN-LOCAL-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${opaqueId("PREVIEW")}`,
    kind: "comun",
    isOfficial: false,
    localOnly: true,
    officialProtocol: null,
  };
}

export function createLocalRelataSubmission(
  input: RelataInput,
  decision: RoutingDecision,
): Submission {
  const consent: Consent = {
    accepted: false,
    version: "relata-preview-1",
    allowsPublicProjection: false,
    allowsOfficialForwarding: false,
  };
  return {
    id: opaqueId("SUBMISSION"),
    reportId: opaqueId("REPORT"),
    protocol: createLocalRelataProtocol(),
    consent,
    attachments: [],
    status: decision.missingInformation.length ? "awaiting_person" : "triage",
    localOnly: true,
  };
}

export function createRelataPreview(
  input: RelataInput,
  decision: RoutingDecision,
) {
  const privacyClass = classifyRelataPrivacy(input);
  return {
    summary: sanitizeRelataSummary(input.text),
    privacyClass,
    decision,
    submission: createLocalRelataSubmission(input, decision),
    noOfficialSend: true as const,
    logEvent: {
      event: "relata_preview_created",
      category: decision.category,
      state: decision.missingInformation.length ? "awaiting_person" : "triage",
      ruleVersion: decision.ruleVersion,
      opaqueReference: "preview-only",
    },
  };
}

export function sanitizeRelataLogEvent(value: Record<string, unknown>) {
  const blocked =
    /(?:text|summary|description|contact|email|phone|token|secret|coordinate|latitude|longitude|attachment|url|address|name|person|raw)/i;
  const unsafeValue =
    /(?:@|\b\d{2,3}[\s().-]*\d{4,5}[\s.-]*\d{4}\b|COMUN-RELATA-|\b(?:cpf|rg)\b|latitude|longitude|endereço)/i;
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, item]) =>
          !blocked.test(key) &&
          !(typeof item === "string" && unsafeValue.test(item)),
      )
      .map(([key, item]) => [
        key,
        typeof item === "string" ? item.slice(0, 80) : item,
      ]),
  );
}
