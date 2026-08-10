import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_URBAN_INCIDENTS_FLAG =
  "COMUN_URBAN_INCIDENTS_ENABLED" as const;
export const COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_FLAG =
  "COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_ENABLED" as const;

export function isComunUrbanIncidentsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_URBAN_INCIDENTS_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}

/**
 * P6B-B deliberately ships classification without institutional forwarding.
 * Production source_domain does not yet have an urban incident adapter.
 */
export function isComunUrbanIncidentsForwardingAssistedEnabled(
  _env: Record<string, string | undefined> = process.env,
) {
  return false;
}
