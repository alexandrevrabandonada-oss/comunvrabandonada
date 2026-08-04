import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_SIDEWALK_RELATA_FORWARDING_FLAG =
  "COMUN_SIDEWALK_RELATA_FORWARDING_LOCAL" as const;
export const COMUN_SIDEWALK_RELATA_PREFIX = "/api/comun/sidewalk-relata" as const;

export function isComunSidewalkRelataForwardingEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SIDEWALK_RELATA_FORWARDING_FLAG] === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    env.COMUN_SIDEWALK_OPERATIONAL_V2 === "enabled" &&
    env.COMUN_RELATA_PREVIEW === "enabled" &&
    env.COMUN_RELATA_LOCAL_PERSISTENCE === "enabled" &&
    env.COMUN_PARTICIPATION_WALLET_LOCAL === "enabled" &&
    env.COMUN_FORWARDING_LOCAL === "enabled" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function shouldCloakComunSidewalkRelata(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    (pathname === COMUN_SIDEWALK_RELATA_PREFIX ||
      pathname.startsWith(`${COMUN_SIDEWALK_RELATA_PREFIX}/`)) &&
    !isComunSidewalkRelataForwardingEnabled(env)
  );
}
