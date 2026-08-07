import { isComunRelataPersistenceEnabled } from "./comun-relata-persistence";

export const COMUN_QUICK_CAPTURE_FLAG = "COMUN_QUICK_CAPTURE_V2" as const;

export function isComunQuickCaptureEnabled(env: Record<string, string | undefined> = process.env) {
  return isComunRelataPersistenceEnabled(env)
    && env[COMUN_QUICK_CAPTURE_FLAG] === "enabled"
}

export function shouldCloakComunQuickCaptureApi(pathname: string, env: Record<string, string | undefined> = process.env) {
  const isApi = pathname === "/api/comun/capture/telemetry" || pathname.startsWith("/api/comun/capture/");
  return isApi && !isComunQuickCaptureEnabled(env);
}
