import {
  isComunRelataCollectiveEnabled,
  isComunRelataLocationEnabled,
} from "./comun-relata-evidence-feature";
import { isComunRelataPersistenceEnabled, isHttpsSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_DENUNCIAS_PUBLIC_MAP_FLAG = "COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED" as const;
export const COMUN_DENUNCIAS_PUBLIC_MAP_PATH = "/comun/denuncias/mapa" as const;
export const COMUN_DENUNCIAS_PUBLIC_MAP_API_PREFIX = "/api/comun/denuncias/mapa" as const;

export function isComunDenunciasPublicMapEnabled(env: Record<string, string | undefined> = process.env) {
  return env[COMUN_DENUNCIAS_PUBLIC_MAP_FLAG] === "enabled"
    && isComunRelataPersistenceEnabled(env)
    && isComunRelataLocationEnabled(env)
    && isComunRelataCollectiveEnabled(env)
    && isHttpsSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)
    && Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function shouldCloakComunDenunciasPublicMap(pathname: string, env: Record<string, string | undefined> = process.env) {
  const api = pathname === COMUN_DENUNCIAS_PUBLIC_MAP_API_PREFIX
    || pathname.startsWith(`${COMUN_DENUNCIAS_PUBLIC_MAP_API_PREFIX}/`);
  const page = pathname === COMUN_DENUNCIAS_PUBLIC_MAP_PATH;
  return (api || page) && !isComunDenunciasPublicMapEnabled(env);
}
