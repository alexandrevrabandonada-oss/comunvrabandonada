import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_PARTICIPATION_WALLET_FLAG =
  "COMUN_PARTICIPATION_WALLET_ENABLED" as const;
export const COMUN_PARTICIPATION_WALLET_LOCAL_FLAG =
  "COMUN_PARTICIPATION_WALLET_LOCAL" as const;
export const COMUN_PARTICIPATION_WALLET_COOKIE =
  "comun_participation_wallet_v1" as const;
export const COMUN_PARTICIPATION_WALLET_PREFIX =
  "/api/comun/participation-wallet" as const;

export function isValidProductionSupabaseUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      /^[a-z0-9]+\.supabase\.co$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isComunParticipationWalletLocalEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_PARTICIPATION_WALLET_LOCAL_FLAG] === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function isComunParticipationWalletEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  const production =
    env[COMUN_PARTICIPATION_WALLET_FLAG] === "enabled" &&
    env.VERCEL_ENV === "production" &&
    isValidProductionSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  return production || isComunParticipationWalletLocalEnabled(env);
}

export function shouldCloakComunParticipationWallet(
  pathname: string,
  env: Record<string, string | undefined> = process.env,
) {
  return (
    (pathname === COMUN_PARTICIPATION_WALLET_PREFIX ||
      pathname.startsWith(`${COMUN_PARTICIPATION_WALLET_PREFIX}/`)) &&
    !isComunParticipationWalletEnabled(env)
  );
}
