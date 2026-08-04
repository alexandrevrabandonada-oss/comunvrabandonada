import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_QUICK_CAPTURE_FLAG = "COMUN_QUICK_CAPTURE_V2" as const;

export function isComunQuickCaptureEnabled(env: Record<string, string | undefined> = process.env) {
  return env.COMUN_RELATA_PREVIEW === "enabled"
    && env.COMUN_RELATA_LOCAL_PERSISTENCE === "enabled"
    && env.COMUN_RELATA_LOCAL_EVIDENCE === "enabled"
    && env[COMUN_QUICK_CAPTURE_FLAG] === "enabled"
    && isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
    && Boolean(env.COMUN_RELATA_LOCATION_ENCRYPTION_KEY)
    && Boolean(env.COMUN_RELATA_SPATIAL_HMAC_KEY);
}

export function shouldCloakComunQuickCaptureApi(pathname: string, env: Record<string, string | undefined> = process.env) {
  const isApi = pathname === "/api/comun/capture/telemetry" || pathname.startsWith("/api/comun/capture/");
  return isApi && !isComunQuickCaptureEnabled(env);
}
