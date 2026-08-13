export const COMUN_PAUTAS_VIVAS_CORE_FLAG =
  "COMUN_PAUTAS_VIVAS_CORE_ENABLED" as const;

export function isComunPautasVivasCoreEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_PAUTAS_VIVAS_CORE_FLAG] === "enabled";
}
