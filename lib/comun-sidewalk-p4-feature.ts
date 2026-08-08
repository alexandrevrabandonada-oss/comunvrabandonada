import { isComunParticipationWalletEnabled } from "./comun-participation-wallet-feature";
import {
  isComunRelataAttachmentsEnabled,
  isComunRelataLocationEnabled,
} from "./comun-relata-evidence-feature";
import {
  isComunRelataPersistenceEnabled,
  isHttpsSupabaseUrl,
} from "./comun-relata-persistence";

export const COMUN_SIDEWALK_RELATA_FLAG =
  "COMUN_SIDEWALK_RELATA_ENABLED" as const;
export const COMUN_SIDEWALK_PUBLIC_PROJECTION_FLAG =
  "COMUN_SIDEWALK_PUBLIC_PROJECTION_ENABLED" as const;
export const COMUN_SIDEWALK_INTAKE_PREFIX = "/api/comun/calcadas/intake" as const;
export const COMUN_SIDEWALK_FINALIZE_PATH =
  "/api/comun/relata/sidewalk/finalize" as const;
export const COMUN_SIDEWALK_CONTRIBUTE_PATH = "/comun/calcadas/contribuir" as const;

export function isComunSidewalkRelataEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SIDEWALK_RELATA_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env) &&
    isComunParticipationWalletEnabled(env) &&
    isComunRelataAttachmentsEnabled(env) &&
    isComunRelataLocationEnabled(env) &&
    (isHttpsSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) ||
      env.ALLOW_LOCAL_TESTS === "true") &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function isComunSidewalkPublicProjectionEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_SIDEWALK_PUBLIC_PROJECTION_FLAG] === "enabled" &&
    isComunSidewalkRelataEnabled(env)
  );
}

export function shouldCloakComunSidewalkP4(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  const intake =
    pathname === COMUN_SIDEWALK_INTAKE_PREFIX ||
    pathname.startsWith(`${COMUN_SIDEWALK_INTAKE_PREFIX}/`) ||
    pathname === COMUN_SIDEWALK_FINALIZE_PATH;
  return intake && !isComunSidewalkRelataEnabled(env);
}
