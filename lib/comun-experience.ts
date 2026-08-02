export const COMUN_APP_V2_EXPERIENCE = "app-v2" as const;
export const COMUN_LEGACY_EXPERIENCE = "legacy" as const;
/** Historical coherence pilot kept as a non-canonical legacy compatibility alias. */
export const COMUN_COHERENCE_EXPERIENCE = "coerencia" as const;

export type ComunExperience =
  typeof COMUN_APP_V2_EXPERIENCE | typeof COMUN_LEGACY_EXPERIENCE;

type ComunExperienceValue =
  string | string[] | null | undefined | URLSearchParams;

function firstExperienceValue(value: ComunExperienceValue) {
  if (value instanceof URLSearchParams) return value.get("experiencia");
  return Array.isArray(value) ? value[0] : value;
}

export function resolveComunExperience(
  value: ComunExperienceValue,
): ComunExperience {
  return firstExperienceValue(value) === COMUN_LEGACY_EXPERIENCE
    || firstExperienceValue(value) === COMUN_COHERENCE_EXPERIENCE
    ? COMUN_LEGACY_EXPERIENCE
    : COMUN_APP_V2_EXPERIENCE;
}

export function isComunAppV2(value: ComunExperienceValue): boolean {
  return resolveComunExperience(value) === COMUN_APP_V2_EXPERIENCE;
}

export function withComunExperience(
  href: string,
  experience: ComunExperience,
): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const parsed = new URL(href, "http://comun.local");
  if (parsed.origin !== "http://comun.local") return href;
  if (experience === COMUN_APP_V2_EXPERIENCE) {
    parsed.searchParams.delete("experiencia");
  } else {
    parsed.searchParams.set("experiencia", COMUN_LEGACY_EXPERIENCE);
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function withComunAppV2(href: string, active = true): string {
  return withComunExperience(
    href,
    active ? COMUN_APP_V2_EXPERIENCE : COMUN_LEGACY_EXPERIENCE,
  );
}

export function canonicalComunHref(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const parsed = new URL(href, "http://comun.local");
  if (parsed.origin !== "http://comun.local") return href;
  parsed.searchParams.delete("experiencia");
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function shouldUseLegacyDefault(
  configuredDefault: string | undefined,
  requestedExperience: string | null,
): boolean {
  return (
    configuredDefault === COMUN_LEGACY_EXPERIENCE &&
    requestedExperience === null
  );
}
