export const COMUN_RODAS_VIVAS_FLAG = "COMUN_RODAS_VIVAS_ENABLED" as const;

export function isComunRodasVivasEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_RODAS_VIVAS_FLAG] === "enabled";
}
