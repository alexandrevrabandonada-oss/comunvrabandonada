import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_FLAG =
  "COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED" as const;
export const COMUN_SENSITIVE_FORWARDING_ASSISTED_FLAG =
  "COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED" as const;

export function isComunPublicHealthSensitiveRoutingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}

/**
 * P6C-A only presents verified public channels. It never builds or sends a
 * package containing health information.
 */
export function isComunSensitiveForwardingAssistedEnabled(
  _env: Record<string, string | undefined> = process.env,
) {
  return false;
}
