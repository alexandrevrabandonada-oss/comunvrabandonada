import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_FORWARDING_FLAG = "COMUN_FORWARDING_LOCAL";
export const COMUN_FORWARDING_PREFIX = "/api/comun/forwarding";
export const FISCALIZA_LIGHTING_ADAPTER_ID = "vr-fiscaliza-lighting-v1";

export function isComunForwardingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_FORWARDING_FLAG] === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function shouldCloakComunForwarding(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    pathname.startsWith(COMUN_FORWARDING_PREFIX) &&
    !isComunForwardingEnabled(env)
  );
}
