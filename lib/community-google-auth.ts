import { safeCommunityReturn } from "./community-return";

export const COMUN_GOOGLE_AUTH_FLAG = "COMUN_GOOGLE_AUTH_ENABLED" as const;
export const COMUN_GOOGLE_CALLBACK_PATH = "/comun/auth/callback" as const;
const DEFAULT_ORIGIN = "https://comunsocial.online";

function isAllowedOrigin(
  value: string,
  env: Record<string, string | undefined> = process.env,
) {
  try {
    const url = new URL(value);
    const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      (localHost || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (localHost ||
        url.hostname === "comunsocial.online" ||
        (url.hostname.endsWith(".vercel.app") && env.VERCEL_ENV === "preview"))
    );
  } catch {
    return false;
  }
}

export function isGoogleAuthEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_GOOGLE_AUTH_FLAG] === "enabled";
}

export function trustedCommunityOrigins(
  env: Record<string, string | undefined> = process.env,
) {
  const configured = (env.COMUN_AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_ENV === "preview" && env.VERCEL_URL
      ? `https://${env.VERCEL_URL}`
      : undefined,
    "http://localhost:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3100",
    DEFAULT_ORIGIN,
    ...configured,
  ].filter((value): value is string => Boolean(value));
  return [...new Set(candidates.filter((value) => isAllowedOrigin(value, env)))];
}

export function trustedCommunityOrigin(
  env: Record<string, string | undefined> = process.env,
) {
  // Production OAuth callbacks are deliberately pinned to the canonical host.
  // A stale or accidentally local NEXT_PUBLIC_SITE_URL must never redirect a
  // production authorization response away from comunsocial.online.
  if (env.VERCEL_ENV === "production") return DEFAULT_ORIGIN;
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    const preview = `https://${env.VERCEL_URL}`;
    if (trustedCommunityOrigins(env).includes(preview)) return preview;
  }
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && trustedCommunityOrigins(env).includes(configured))
    return configured.replace(/\/$/, "");
  return DEFAULT_ORIGIN;
}

export type GoogleProfileAccess = "active" | "complete_account" | "denied";

export function googleProfileAccess(
  profile:
    | { status: string; onboarding_completed_at: string | null }
    | null
    | undefined,
): GoogleProfileAccess {
  if (
    !profile ||
    ["suspended", "deactivation_requested", "deactivated", "archived"].includes(
      profile.status,
    )
  )
    return "denied";
  return profile.onboarding_completed_at ? "active" : "complete_account";
}

export function googleCallbackUrl(
  returnTo: unknown,
  env: Record<string, string | undefined> = process.env,
) {
  const safeReturnTo = safeCommunityReturn(returnTo);
  const origin = trustedCommunityOrigin(env);
  const params = new URLSearchParams({ returnTo: safeReturnTo });
  return `${origin}${COMUN_GOOGLE_CALLBACK_PATH}?${params.toString()}`;
}

export function googleCompletionHref(returnTo: unknown) {
  const params = new URLSearchParams({ returnTo: safeCommunityReturn(returnTo) });
  return `/comun/completar-conta?${params.toString()}`;
}

export function googleAuthErrorHref() {
  return "/comun/entrar?erro=google";
}

export function suggestedCommunityName(metadata: Record<string, unknown> | null | undefined) {
  const candidate = String(metadata?.full_name ?? metadata?.name ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return candidate.length >= 2 ? candidate : "Pessoa participante";
}
