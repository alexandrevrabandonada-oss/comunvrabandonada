import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_FLAG =
  "COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED" as const;

export function isComunChildProtectionPrivateRoutingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}
