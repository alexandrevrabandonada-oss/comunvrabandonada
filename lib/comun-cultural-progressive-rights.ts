export const COMUN_CULTURAL_PROGRESSIVE_RIGHTS_FLAG =
  "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED" as const;

export const CULTURAL_RIGHTS_CONTRACT_VERSION = "a4-20260819-v1" as const;

export function isComunCulturalProgressiveRightsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_CULTURAL_PROGRESSIVE_RIGHTS_FLAG] === "enabled";
}

export type RightsDecision = {
  state: "rights_declared" | "rights_review_required";
  reason: "declared" | "unresolved_third_party" | "unknown_authorship";
};

const displayScopes = new Set(["comun_display", "comun_display_and_reuse"]);
const reuseScopes = new Set(["comun_display_and_reuse", "comun_audio_and_reuse"]);
const photoBases = new Set(["own_creation", "authorized_by_rightsholder", "public_official_material", "historical_unknown", "third_party_unverified"]);
const artworkBases = new Set(["uploader_creator", "collective_representative", "authorized_by_creator", "unknown"]);
const voiceSources = new Set(["no_voice", "submitter_voice", "third_party_voice", "unknown"]);
const materialSources = new Set(["original_text", "authorized_third_party", "third_party_unverified", "unknown"]);

function hasValidReuseDeclaration(scope: string, reuse: string, licenseCode?: string | null) {
  if (reuse === "licensed_reuse" && ["not_defined", "none", ""].includes(licenseCode ?? "")) return false;
  if (reuse === "comun_only" && scope === "review_only") return false;
  if (reuseScopes.has(scope) && !["comun_only", "licensed_reuse"].includes(reuse)) return false;
  return ["not_defined", "comun_only", "licensed_reuse"].includes(reuse);
}

export function decidePhotoRights(input: {
  rightsBasis: string;
  publicationScope: string;
  reusePermission: string;
  licenseCode?: string | null;
}): RightsDecision | null {
  if (!photoBases.has(input.rightsBasis) || !["review_only", "comun_display", "comun_display_and_reuse"].includes(input.publicationScope))
    return null;
  if (!hasValidReuseDeclaration(input.publicationScope, input.reusePermission, input.licenseCode)) return null;
  if (input.rightsBasis === "third_party_unverified")
    return { state: "rights_review_required", reason: "unresolved_third_party" };
  if (input.rightsBasis === "historical_unknown")
    return { state: "rights_review_required", reason: "unknown_authorship" };
  return { state: "rights_declared", reason: "declared" };
}

export function decideArtworkRights(input: {
  authorshipBasis: string;
  publicationScope: string;
  reusePermission: string;
  identityPreference: string;
  licenseCode?: string | null;
}): RightsDecision | null {
  if (!artworkBases.has(input.authorshipBasis) || !["review_only", "comun_display", "comun_display_and_reuse"].includes(input.publicationScope) || !["anonymous", "public_credit", "artistic_name", "collective"].includes(input.identityPreference)) return null;
  if (!hasValidReuseDeclaration(input.publicationScope, input.reusePermission, input.licenseCode)) return null;
  if (input.authorshipBasis === "unknown") return { state: "rights_review_required", reason: "unknown_authorship" };
  if (input.authorshipBasis === "authorized_by_creator" && input.publicationScope === "review_only") return { state: "rights_declared", reason: "declared" };
  return { state: "rights_declared", reason: "declared" };
}

export function decideRadioRights(input: {
  voiceSource: string;
  materialSource: string;
  publicationScope: string;
  reusePermission: string;
  identityPreference: string;
  licenseCode?: string | null;
}): RightsDecision | null {
  if (!voiceSources.has(input.voiceSource) || !materialSources.has(input.materialSource) || !["review_only", "comun_audio", "comun_audio_and_reuse"].includes(input.publicationScope) || !["anonymous", "public_credit", "artistic_name", "collective"].includes(input.identityPreference)) return null;
  if (!hasValidReuseDeclaration(input.publicationScope, input.reusePermission, input.licenseCode)) return null;
  if (["third_party_voice", "unknown"].includes(input.voiceSource) || ["third_party_unverified", "unknown"].includes(input.materialSource))
    return { state: "rights_review_required", reason: "unresolved_third_party" };
  return { state: "rights_declared", reason: "declared" };
}

export function hasExplicitPublicScope(scope: string) {
  return displayScopes.has(scope) || reuseScopes.has(scope);
}

export function hasExplicitReuseScope(scope: string) {
  return reuseScopes.has(scope);
}
