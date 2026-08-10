import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_FLAG =
  "COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED" as const;

export function isComunPublicEducationSensitiveRoutingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env)
  );
}
