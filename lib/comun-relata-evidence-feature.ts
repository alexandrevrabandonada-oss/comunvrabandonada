import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";
import { isComunRelataPersistenceEnabled, isHttpsSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_RELATA_EVIDENCE_FLAG =
  "COMUN_RELATA_LOCAL_EVIDENCE" as const;
export const COMUN_RELATA_ATTACHMENTS_FLAG =
  "COMUN_RELATA_ATTACHMENTS_ENABLED" as const;
export const COMUN_RELATA_LOCATION_FLAG =
  "COMUN_RELATA_LOCATION_ENABLED" as const;
export const COMUN_RELATA_COLLECTIVE_FLAG =
  "COMUN_RELATA_COLLECTIVE_ENABLED" as const;
export const COMUN_RELATA_LOCATION_KEY =
  "COMUN_RELATA_LOCATION_ENCRYPTION_KEY" as const;
export const COMUN_RELATA_SPATIAL_KEY =
  "COMUN_RELATA_SPATIAL_HMAC_KEY" as const;
export const COMUN_RELATA_EVIDENCE_API_PREFIX =
  "/api/comun/relata/evidence" as const;
export const COMUN_RELATA_PUBLIC_MAP_FLAG =
  "COMUN_RELATA_LOCAL_PUBLIC_MAP" as const;
export const COMUN_RELATA_PUBLIC_MAP_API_PREFIX =
  "/api/comun/relata/public" as const;
export const COMUN_RELATA_PUBLIC_MAP_PATH = "/comun/relata/mapa" as const;

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

function localEvidenceRuntime(env: Record<string, string | undefined>) {
  return (
    env[COMUN_RELATA_EVIDENCE_FLAG] === "enabled" &&
    env.COMUN_RELATA_PREVIEW === "enabled" &&
    env.COMUN_RELATA_LOCAL_PERSISTENCE === "enabled" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function isComunRelataAttachmentsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const production =
    env[COMUN_RELATA_ATTACHMENTS_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env) &&
    isHttpsSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const local = localEvidenceRuntime(env)
    ? validLocalKey(env[COMUN_RELATA_LOCATION_KEY]) &&
      validLocalKey(env[COMUN_RELATA_SPATIAL_KEY]) &&
      env[COMUN_RELATA_LOCATION_KEY] !== env[COMUN_RELATA_SPATIAL_KEY]
    : false;
  return production || local;
}

export function isComunRelataLocationEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const production =
    env[COMUN_RELATA_LOCATION_FLAG] === "enabled" &&
    isComunRelataPersistenceEnabled(env) &&
    isHttpsSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const hasDistinctKeys = () =>
    validLocalKey(env[COMUN_RELATA_LOCATION_KEY]) &&
    validLocalKey(env[COMUN_RELATA_SPATIAL_KEY]) &&
    env[COMUN_RELATA_LOCATION_KEY] !== env[COMUN_RELATA_SPATIAL_KEY];
  return (production || localEvidenceRuntime(env)) && hasDistinctKeys();
}

export function isComunRelataEvidenceEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return isComunRelataAttachmentsEnabled(env) || isComunRelataLocationEnabled(env);
}

export function isComunRelataCollectiveEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return isComunRelataLocationEnabled(env) &&
    env[COMUN_RELATA_COLLECTIVE_FLAG] === "enabled";
}

export function shouldCloakComunRelataEvidenceApi(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  const isEvidenceApi =
    pathname === COMUN_RELATA_EVIDENCE_API_PREFIX ||
    pathname.startsWith(`${COMUN_RELATA_EVIDENCE_API_PREFIX}/`);
  if (!isEvidenceApi) return false;
  if (pathname === COMUN_RELATA_EVIDENCE_API_PREFIX) return !isComunRelataEvidenceEnabled(env);
  if (pathname.startsWith(`${COMUN_RELATA_EVIDENCE_API_PREFIX}/attachments`)) return !isComunRelataAttachmentsEnabled(env);
  if (pathname.startsWith(`${COMUN_RELATA_EVIDENCE_API_PREFIX}/location`)) return !isComunRelataLocationEnabled(env);
  if (pathname.startsWith(`${COMUN_RELATA_EVIDENCE_API_PREFIX}/grouping`)) return !isComunRelataCollectiveEnabled(env);
  return true;
}

export function areComunRelataPublicMapFlagsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    areComunRelataEvidenceFlagsEnabled(env) &&
    env[COMUN_RELATA_PUBLIC_MAP_FLAG] === "enabled"
  );
}

export function isComunRelataPublicMapEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  // The map is deliberately cumulative: no fourth flag can bypass evidence
  // or local persistence. Keys are still validated by the evidence gate.
  return areComunRelataPublicMapFlagsEnabled(env) && isComunRelataEvidenceEnabled(env);
}

export function shouldCloakComunRelataPublicMap(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  const isApi =
    pathname === COMUN_RELATA_PUBLIC_MAP_API_PREFIX ||
    pathname.startsWith(`${COMUN_RELATA_PUBLIC_MAP_API_PREFIX}/`);
  const isPage = pathname === COMUN_RELATA_PUBLIC_MAP_PATH;
  return (isApi || isPage) && !isComunRelataPublicMapEnabled(env);
}
