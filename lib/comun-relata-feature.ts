export const COMUN_RELATA_FLAG = "COMUN_RELATA_PREVIEW" as const;

export type RelataFeatureState = "enabled" | "disabled";

export function getRelataFeatureState(
  env: Record<string, string | undefined> = process.env,
): RelataFeatureState {
  return env[COMUN_RELATA_FLAG] === "enabled" ? "enabled" : "disabled";
}

export function isComunRelataEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return getRelataFeatureState(env) === "enabled";
}
