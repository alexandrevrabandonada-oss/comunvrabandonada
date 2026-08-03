import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_RELATA_EVIDENCE_FLAG =
  "COMUN_RELATA_LOCAL_EVIDENCE" as const;
export const COMUN_RELATA_LOCATION_KEY =
  "COMUN_RELATA_LOCATION_ENCRYPTION_KEY" as const;
export const COMUN_RELATA_SPATIAL_KEY =
  "COMUN_RELATA_SPATIAL_HMAC_KEY" as const;
export const COMUN_RELATA_EVIDENCE_API_PREFIX =
  "/api/comun/relata/evidence" as const;

function validLocalKey(value: string | undefined) {
  if (!value || value.length > 128) return false;
  try {
    return Buffer.from(value, "base64url").byteLength === 32;
  } catch {
    return false;
  }
}
export function areComunRelataEvidenceFlagsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.COMUN_RELATA_PREVIEW === "enabled" &&
    env.COMUN_RELATA_LOCAL_PERSISTENCE === "enabled" &&
    env[COMUN_RELATA_EVIDENCE_FLAG] === "enabled" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

export function isComunRelataEvidenceEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (!areComunRelataEvidenceFlagsEnabled(env)) return false;
  return (
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY) &&
    validLocalKey(env[COMUN_RELATA_LOCATION_KEY]) &&
    validLocalKey(env[COMUN_RELATA_SPATIAL_KEY]) &&
    env[COMUN_RELATA_LOCATION_KEY] !== env[COMUN_RELATA_SPATIAL_KEY]
  );
}

export function shouldCloakComunRelataEvidenceApi(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  const isEvidenceApi =
    pathname === COMUN_RELATA_EVIDENCE_API_PREFIX ||
    pathname.startsWith(`${COMUN_RELATA_EVIDENCE_API_PREFIX}/`);
  return isEvidenceApi && !isComunRelataEvidenceEnabled(env);
}
