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
  const appV2 = new URL(safeReturn, "http://comun.local").searchParams.get(
    "experiencia",
  );
  const params = new URLSearchParams({ returnTo: safeReturn });
  if (appV2 === "app-v2") params.set("experiencia", "app-v2");
  return `/comun/entrar?${params.toString()}`;
}

export function communityOnboardingHref(returnTo: string) {
  const safeReturn = safeCommunityReturn(returnTo);
  const params = new URLSearchParams({ returnTo: safeReturn });
  if (
    new URL(safeReturn, "http://comun.local").searchParams.get(
      "experiencia",
    ) === "app-v2"
  )
    params.set("experiencia", "app-v2");
  return `/comun/onboarding?${params.toString()}`;
}
