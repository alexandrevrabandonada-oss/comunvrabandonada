import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";
export {
  COMUN_SENSITIVE_FORWARDING_ASSISTED_FLAG,
  isComunSensitiveForwardingAssistedEnabled,
} from "./comun-sensitive-forwarding-feature";

export const COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_FLAG =
  "COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED" as const;

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
