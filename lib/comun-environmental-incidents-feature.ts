import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";
import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";

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

export function isComunEnvironmentalForwardingAssistedEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_FLAG] === "enabled" &&
    isComunEnvironmentalIncidentsEnabled(env) &&
    isComunParticipationWalletEnabled(env) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
