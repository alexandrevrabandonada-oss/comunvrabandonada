const FALLBACK_RETURN = "/comun/minha-participacao";
const BLOCKED_PREFIXES = ["/comun/admin", "/comun/entrar", "/comun/criar-conta", "/comun/onboarding"];

export function safeCommunityReturn(value: unknown, fallback = FALLBACK_RETURN) {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate || candidate.length > 1200 || /[\\\u0000-\u001f]/.test(candidate)) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "http://comun.local");
    if (parsed.origin !== "http://comun.local") return fallback;
    if (parsed.username || parsed.password) return fallback;
    if (parsed.pathname !== "/comun" && !parsed.pathname.startsWith("/comun/")) return fallback;
    if (BLOCKED_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`))) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function communityLoginHref(returnTo: string) {
  return `/comun/entrar?returnTo=${encodeURIComponent(safeCommunityReturn(returnTo))}`;
}

export function communityOnboardingHref(returnTo: string) {
  return `/comun/onboarding?returnTo=${encodeURIComponent(safeCommunityReturn(returnTo))}`;
}
