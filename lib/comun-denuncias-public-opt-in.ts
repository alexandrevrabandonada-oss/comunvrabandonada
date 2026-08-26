export const COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES = [
  "public_lighting",
  "power_distribution",
  "smoke_or_environmental_trace",
] as const;

export type ComunPublicProjectionOptInCategory =
  (typeof COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES)[number];

export function isComunPublicProjectionOptInCategory(
  category: string | null | undefined,
): category is ComunPublicProjectionOptInCategory {
  return (COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES as readonly string[]).includes(
    category ?? "",
  );
}
