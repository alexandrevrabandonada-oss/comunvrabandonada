export const COMUN_BUS_LOCAL_PILOT_FLAG = "COMUN_BUS_LOCAL_PILOT" as const;
export const COMUN_BUS_PATH = "/comun/onibus" as const;
export const COMUN_BUS_API_PREFIX = "/api/comun/onibus" as const;

function loopback(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      Boolean(url.port);
  } catch { return false; }
}

export function isComunBusLocalPilotEnabled(env: Record<string, string | undefined> = process.env) {
  return env[COMUN_BUS_LOCAL_PILOT_FLAG] === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    loopback(env.COMUN_BASE_URL) &&
    loopback(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function shouldCloakComunBus(pathname: string, env: Record<string, string | undefined> = process.env) {
  const matches = pathname === COMUN_BUS_PATH ||
    pathname.startsWith(`${COMUN_BUS_PATH}/`) ||
    pathname === COMUN_BUS_API_PREFIX ||
    pathname.startsWith(`${COMUN_BUS_API_PREFIX}/`);
  return matches && !isComunBusLocalPilotEnabled(env);
}

export const COMUN_BUS_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-robots-tag": "noindex, nofollow, noarchive",
} as const;
