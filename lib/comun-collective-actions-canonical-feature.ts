export const COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_FLAG =
  "COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_ENABLED";

export function isComunCollectiveActionsCanonicalExperienceEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_COLLECTIVE_ACTIONS_CANONICAL_EXPERIENCE_FLAG] === "enabled";
}
