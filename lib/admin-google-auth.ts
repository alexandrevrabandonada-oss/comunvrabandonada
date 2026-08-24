import { trustedCommunityOrigin } from "./community-google-auth";

const ADMIN_FALLBACK = "/comun/admin";
export const COMUN_ADMIN_GOOGLE_CALLBACK_PATH =
  "/comun/admin/auth/callback" as const;

export function adminLoginReasonMessage(reason: unknown) {
  if (reason === "not-authorized")
    return "A conta Google foi autenticada, mas ainda não possui autorização administrativa ativa no COMUN.";
  if (reason === "google")
    return "Não foi possível concluir o acesso com Google. Tente novamente.";
  return null;
}

export function safeAdminReturn(value: unknown) {
  if (typeof value !== "string") return ADMIN_FALLBACK;
  const candidate = value.trim();
  if (
    !candidate ||
    candidate.length > 1200 ||
    /[\\\u0000-\u001f]/.test(candidate)
  )
    return ADMIN_FALLBACK;
  try {
    const parsed = new URL(candidate, "http://comun.local");
    if (
      parsed.origin !== "http://comun.local" ||
      parsed.username ||
      parsed.password ||
      (parsed.pathname !== "/comun/admin" &&
        !parsed.pathname.startsWith("/comun/admin/")) ||
      parsed.pathname === "/comun/admin/login" ||
      parsed.pathname.startsWith("/comun/admin/auth/")
    )
      return ADMIN_FALLBACK;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return ADMIN_FALLBACK;
  }
}

export function adminGoogleCallbackUrl(
  returnTo: unknown,
  env: Record<string, string | undefined> = process.env,
) {
  const params = new URLSearchParams({ returnTo: safeAdminReturn(returnTo) });
  return `${trustedCommunityOrigin(env)}${COMUN_ADMIN_GOOGLE_CALLBACK_PATH}?${params.toString()}`;
}
