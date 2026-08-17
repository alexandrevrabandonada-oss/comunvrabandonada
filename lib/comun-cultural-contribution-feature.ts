export const COMUN_CULTURAL_SAVE_FIRST_INTAKE_FLAG = "COMUN_CULTURAL_SAVE_FIRST_INTAKE_ENABLED" as const;

export function isComunCulturalSaveFirstIntakeEnabled(env: Record<string, string | undefined> = process.env) {
  return env[COMUN_CULTURAL_SAVE_FIRST_INTAKE_FLAG] === "enabled";
}
