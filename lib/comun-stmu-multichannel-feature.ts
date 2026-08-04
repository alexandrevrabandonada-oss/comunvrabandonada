import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_STMU_MULTICHANNEL_FLAG =
  "COMUN_STMU_MULTICHANNEL_LOCAL" as const;
export const COMUN_STMU_MULTICHANNEL_PREFIX =
  "/api/comun/stmu-multichannel" as const;

export function isComunStmuMultichannelEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_STMU_MULTICHANNEL_FLAG] === "enabled" &&
    env.COMUN_STMU_WHATSAPP_ASSISTED_LOCAL === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    env.COMUN_BUS_LOCAL_PILOT === "enabled" &&
    env.COMUN_RELATA_PREVIEW === "enabled" &&
    env.COMUN_RELATA_LOCAL_PERSISTENCE === "enabled" &&
    env.COMUN_PARTICIPATION_WALLET_LOCAL === "enabled" &&
    env.COMUN_FORWARDING_LOCAL === "enabled" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function shouldCloakComunStmuMultichannel(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    pathname.startsWith(COMUN_STMU_MULTICHANNEL_PREFIX) &&
    !isComunStmuMultichannelEnabled(env)
  );
}
