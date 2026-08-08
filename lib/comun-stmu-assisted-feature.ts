import { isComunBusRelataEnabled } from "./comun-bus-feature";

export const COMUN_STMU_ASSISTED_FLAG = "COMUN_STMU_ASSISTED_ENABLED" as const;
export const COMUN_STMU_ASSISTED_PREFIX = "/api/comun/stmu-assisted" as const;

export function isComunStmuAssistedEnabled(env: Record<string, string | undefined> = process.env) {
  const walletEnabled = env.COMUN_PARTICIPATION_WALLET_ENABLED === "enabled" ||
    (env.ALLOW_LOCAL_TESTS === "true" && env.COMUN_PARTICIPATION_WALLET_LOCAL === "enabled");
  return env[COMUN_STMU_ASSISTED_FLAG] === "enabled" &&
    isComunBusRelataEnabled(env) &&
    walletEnabled &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
}

export function shouldCloakComunStmuAssisted(pathname: string, env: Record<string, string | undefined> = process.env) {
  return pathname.startsWith(COMUN_STMU_ASSISTED_PREFIX) && !isComunStmuAssistedEnabled(env);
}
