import { isComunRelataPhotoOnlyEnabled } from "./comun-relata-photo-first";
import { isComunSidewalkRelataEnabled } from "./comun-sidewalk-p4-feature";

export const COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_FLAG =
  "COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_ENABLED" as const;

export function isComunSidewalkProgressiveCaptureEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SIDEWALK_PROGRESSIVE_CAPTURE_FLAG] === "enabled" &&
    isComunSidewalkRelataEnabled(env) &&
    isComunRelataPhotoOnlyEnabled(env)
  );
}

export function createComunSidewalkProgressiveCaptureDecision() {
  return {
    category: "sidewalk_accessibility" as const,
    urgency: "attention" as const,
    collectivePotential: "community_review" as const,
    suggestedDestination: null,
    privacy: "sensitive" as const,
    requiresHumanReview: true,
    missingInformation: [] as string[],
    ruleVersion: "relata-routing-v1" as const,
    confidence: "low" as const,
    source: "sidewalk_progressive_photo_first" as const,
    captureBasis: "photo_only" as const,
    semanticTextState: "absent" as const,
    captureState: "captured_private" as const,
    requiresEnrichment: true as const,
    automaticForwarding: false as const,
  };
}
