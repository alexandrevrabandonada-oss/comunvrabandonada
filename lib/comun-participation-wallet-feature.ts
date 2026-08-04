import { isLoopbackSupabaseUrl } from "./comun-relata-persistence";

export const COMUN_PARTICIPATION_WALLET_FLAG =
  "COMUN_PARTICIPATION_WALLET_LOCAL" as const;
export const COMUN_PARTICIPATION_WALLET_COOKIE =
  "comun_participation_wallet_v1" as const;
export const COMUN_PARTICIPATION_WALLET_PREFIX =
  "/api/comun/participation-wallet" as const;

export function isComunParticipationWalletEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env[COMUN_PARTICIPATION_WALLET_FLAG] === "enabled" &&
    env.ALLOW_LOCAL_TESTS === "true" &&
    isLoopbackSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(env.SUPABASE_SERVICE_ROLE_KEY)
  );
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
