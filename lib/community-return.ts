const FALLBACK_RETURN = "/comun/minha-participacao";
const BLOCKED_PREFIXES = [
  "/comun/admin",
  "/comun/entrar",
  "/comun/criar-conta",
  "/comun/onboarding",
];

export function safeCommunityReturn(
  value: unknown,
  fallback = FALLBACK_RETURN,
) {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (
    !candidate ||
    candidate.length > 1200 ||
    /[\\\u0000-\u001f]/.test(candidate)
  )
    return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "http://comun.local");
    if (parsed.origin !== "http://comun.local") return fallback;
    if (parsed.username || parsed.password) return fallback;
    if (parsed.pathname !== "/comun" && !parsed.pathname.startsWith("/comun/"))
      return fallback;
    if (
      BLOCKED_PREFIXES.some(
        (prefix) =>
          parsed.pathname === prefix ||
          parsed.pathname.startsWith(`${prefix}/`),
      )
    )
      return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function communityLoginHref(returnTo: string) {
  const safeReturn = safeCommunityReturn(returnTo);
  const experience = resolveComunExperience(
    new URL(safeReturn, "http://comun.local").searchParams.get("experiencia"),
  );
  const params = new URLSearchParams({
    returnTo: withComunExperience(safeReturn, experience),
  });
  if (experience === COMUN_LEGACY_EXPERIENCE)
    params.set("experiencia", COMUN_LEGACY_EXPERIENCE);
  return `/comun/entrar?${params.toString()}`;
}

export function communityOnboardingHref(returnTo: string) {
  const safeReturn = safeCommunityReturn(returnTo);
  const experience = resolveComunExperience(
    new URL(safeReturn, "http://comun.local").searchParams.get("experiencia"),
  );
  const params = new URLSearchParams({
    returnTo: withComunExperience(safeReturn, experience),
  });
  if (experience === COMUN_LEGACY_EXPERIENCE)
    params.set("experiencia", COMUN_LEGACY_EXPERIENCE);
  return `/comun/onboarding?${params.toString()}`;
}
import {
  COMUN_LEGACY_EXPERIENCE,
  resolveComunExperience,
  withComunExperience,
} from "./comun-experience";
