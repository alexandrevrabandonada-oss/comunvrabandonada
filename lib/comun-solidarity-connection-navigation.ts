import {
  resolveComunExperience,
  withComunExperience,
} from "./comun-experience";

export type SolidarityJourneyContext = {
  experiencia?: unknown;
  origem?: unknown;
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Only public UI context is carried; no arbitrary return URL or query is copied. */
export function solidarityConnectionHref(
  kind: "offer" | "need",
  organizationSlug: string,
  subjectSlug: string,
  context: SolidarityJourneyContext = {},
) {
  if (!SLUG.test(organizationSlug) || !SLUG.test(subjectSlug))
    return "/comun/cooperativas";
  const segment =
    kind === "offer"
      ? `ofertas/${subjectSlug}/interesse`
      : `necessidades/${subjectSlug}/ajudar`;
  const href = `/comun/cooperativas/${organizationSlug}/${segment}${context.origem === "feirinha" ? "?origem=feirinha" : ""}`;
  return withComunExperience(
    href,
    resolveComunExperience(
      typeof context.experiencia === "string" ? context.experiencia : undefined,
    ),
  );
}
export function solidarityJourneyReturnHref(
  organizationSlug: string,
  context: SolidarityJourneyContext = {},
) {
  const path =
    context.origem === "feirinha" || !SLUG.test(organizationSlug)
      ? "/comun/cooperativas"
      : `/comun/cooperativas/${organizationSlug}`;
  return withComunExperience(
    path,
    resolveComunExperience(
      typeof context.experiencia === "string" ? context.experiencia : undefined,
    ),
  );
}
