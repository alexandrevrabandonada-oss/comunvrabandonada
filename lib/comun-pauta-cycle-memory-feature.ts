export function isComunPautaCycleMemoryEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env.COMUN_PAUTA_CYCLE_MEMORY_ENABLED === "enabled";
}
