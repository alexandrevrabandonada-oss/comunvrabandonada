import type { RoutingDecision } from "./comun-relata-contract";
import { COMUN_RELATA_RULE_VERSION } from "./comun-relata-contract";
import { isComunQuickCaptureEnabled } from "./comun-capture-feature";
import { isComunRelataAttachmentsEnabled } from "./comun-relata-evidence-feature";

export const COMUN_RELATA_PHOTO_ONLY_FLAG =
  "COMUN_RELATA_PHOTO_ONLY_ENABLED" as const;

export type ComunRelataPhotoOnlyDecision = RoutingDecision & {
  source: "photo_first_private_capture";
  captureBasis: "photo_only";
  semanticTextState: "absent";
  captureState: "captured_private";
  requiresEnrichment: true;
  automaticForwarding: false;
};

export function isComunRelataPhotoOnlyEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_RELATA_PHOTO_ONLY_FLAG] === "enabled" &&
    isComunQuickCaptureEnabled(env) &&
    isComunRelataAttachmentsEnabled(env)
  );
}

export function createComunRelataPhotoOnlyDecision(): ComunRelataPhotoOnlyDecision {
  return {
    category: "other",
    urgency: "attention",
    agencyKind: "community_review",
    explanation: "Foto guardada privadamente para revisão",
    nextStep: "Você pode acrescentar uma descrição agora ou pela Carteira.",
    missingInformation: [],
    adaptiveQuestions: [],
    privacyClass: "sensitive",
    publication: "never_automatic",
    requiresHumanReview: true,
    ruleVersion: COMUN_RELATA_RULE_VERSION,
    confidence: "low",
    source: "photo_first_private_capture",
    captureBasis: "photo_only",
    semanticTextState: "absent",
    captureState: "captured_private",
    requiresEnrichment: true,
    automaticForwarding: false,
  };
}

export function isComunRelataPhotoOnlyCapture(input: {
  text: string;
  semanticTextAbsent: boolean;
  hasPhoto: boolean;
  quickCapture: boolean;
  photoOnlyEnabled: boolean;
}) {
  return (
    input.quickCapture &&
    input.photoOnlyEnabled &&
    input.semanticTextAbsent &&
    input.hasPhoto &&
    input.text.length === 0
  );
}
