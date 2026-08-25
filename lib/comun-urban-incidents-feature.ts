import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";
import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";

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

export function isComunUrbanIncidentsForwardingAssistedEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_URBAN_INCIDENTS_FORWARDING_ASSISTED_FLAG] === "enabled" &&
    isComunUrbanIncidentsEnabled(env) &&
    isComunParticipationWalletEnabled(env) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
