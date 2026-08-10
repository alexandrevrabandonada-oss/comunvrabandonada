import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_ENVIRONMENTAL_INCIDENTS_FLAG =
  "COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED" as const;
export const COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_FLAG =
  "COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED" as const;

export function isComunEnvironmentalIncidentsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_ENVIRONMENTAL_INCIDENTS_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}

/**
 * Environmental forwarding intentionally fails closed in P6B-A. Production's
 * source_domain constraint currently accepts only bus and essential_service.
 */
export function isComunEnvironmentalForwardingAssistedEnabled(
  _env: Record<string, string | undefined> = process.env,
) {
  return false;
}
