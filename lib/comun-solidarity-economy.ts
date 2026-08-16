export const COMUN_SOLIDARITY_ECONOMY_CONTRACT_VERSION =
  "comun.solidarity-economy.public-directory.v1" as const;

export const COMUN_SOLIDARITY_DIRECTORY_LIMIT = 250;

export const PUBLIC_SOLIDARITY_ORGANIZATION_STATUSES = [
  "active",
  "forming",
] as const;
export const PUBLIC_SOLIDARITY_VERIFICATION_STATUSES = [
  "source_checked",
  "verified",
] as const;
export const PUBLIC_SOLIDARITY_TERRITORY_STATUSES = [
  "active",
  "monitoring",
] as const;
export const PUBLIC_SOLIDARITY_NEED_STATUSES = [
  "open",
  "partially_met",
] as const;
export const SOLIDARITY_OFFER_KINDS = [
  "good",
  "service",
  "resource",
  "space",
  "skill",
  "support",
  "other",
] as const;
export const SOLIDARITY_OFFER_MODALITIES = [
  "sale",
  "exchange",
  "donation",
  "loan",
  "cession",
  "mutual_aid",
  "cooperation",
  "other",
] as const;

const ORGANIZATION_TYPES = [
  "cooperative",
  "association",
  "collective",
  "informal_group",
  "solidarity_enterprise",
  "network",
  "other",
] as const;
export const SOLIDARITY_NEED_TYPES = [
  "equipment",
  "vehicle",
  "space",
  "input",
  "training",
  "technical_support",
  "partnership",
  "volunteering",
  "donation",
  "hiring",
  "infrastructure",
  "communication",
  "other",
] as const;

export const COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_FLAG =
  "COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_ENABLED" as const;

export function isComunSolidarityEconomyPublicCoreEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return env[COMUN_SOLIDARITY_ECONOMY_PUBLIC_CORE_FLAG] === "enabled";
}

export type PublicSolidarityTerritoryV1 = {
  territoryId: string;
  slug: string;
  municipality: string | null;
  neighborhoodLabel: string | null;
  publicApproximateAddress: string | null;
};

export type PublicSolidarityOrganizationV1 = {
  territoryId: string;
  slug: string;
  publicName: string;
  organizationType: (typeof ORGANIZATION_TYPES)[number];
  organizationStatus: (typeof PUBLIC_SOLIDARITY_ORGANIZATION_STATUSES)[number];
  verificationStatus: (typeof PUBLIC_SOLIDARITY_VERIFICATION_STATUSES)[number];
  presentation: string | null;
  services: readonly string[];
  serviceTerritory: string | null;
  publicContact: string | null;
  lastVerifiedAt: string | null;
  territory: PublicSolidarityTerritoryV1;
};

export type PublicSolidarityOfferOrganizationV1 = Pick<
  PublicSolidarityOrganizationV1,
  "territoryId" | "slug" | "publicName" | "organizationType"
>;

export type PublicSolidarityOfferV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  kind: (typeof SOLIDARITY_OFFER_KINDS)[number];
  modalities: readonly (typeof SOLIDARITY_OFFER_MODALITIES)[number][];
  priceAmountCents: number | null;
  priceCurrency: "BRL" | null;
  priceNote: string | null;
  availability: string | null;
  validUntil: string;
  organization: PublicSolidarityOfferOrganizationV1;
};

export type PublicSolidarityNeedV1 = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  needType: (typeof SOLIDARITY_NEED_TYPES)[number];
  status: (typeof PUBLIC_SOLIDARITY_NEED_STATUSES)[number];
  dueAt: string | null;
  organization: PublicSolidarityOfferOrganizationV1 | null;
  territory: PublicSolidarityTerritoryV1 | null;
};

export type PublicSolidarityEconomyDirectoryV1 = {
  contractVersion: typeof COMUN_SOLIDARITY_ECONOMY_CONTRACT_VERSION;
  sourceKind: "reviewed_public_data";
  sourceState: "available" | "unavailable";
  coverageState: "complete_for_bounded_projection" | "partial_due_to_safety_cap";
  organizations: readonly PublicSolidarityOrganizationV1[];
  offers: readonly PublicSolidarityOfferV1[];
  needs: readonly PublicSolidarityNeedV1[];
  limitations: readonly string[];
  deferred: {
    individualProducers: "COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE";
    publicWrites: "COMUN_48_4_A3_AUTHORIZED_ORGANIZATION_WRITES_AVAILABLE";
    exchange: "DEFERRED_UNTIL_EXPLICIT_CONSENT_FLOW";
  };
};

export type RawSolidarityTerritoryRow = Record<string, unknown> & {
  id?: unknown;
  slug?: unknown;
  municipality?: unknown;
  neighborhood?: unknown;
  public_approximate_address?: unknown;
  status?: unknown;
  visibility?: unknown;
  verification_status?: unknown;
};

export type RawSolidarityOrganizationRow = Record<string, unknown> & {
  territory_id?: unknown;
  public_name?: unknown;
  organization_type?: unknown;
  status?: unknown;
  service_territory_public?: unknown;
  presentation_public?: unknown;
  services_public?: unknown;
  public_contact_authorized?: unknown;
  verification_status?: unknown;
  last_verified_at?: unknown;
};

export type RawSolidarityOfferRow = Record<string, unknown> & {
  id?: unknown;
  slug?: unknown;
  organization_territory_id?: unknown;
  title?: unknown;
  public_summary?: unknown;
  offer_kind?: unknown;
  modalities?: unknown;
  price_amount_cents?: unknown;
  price_currency?: unknown;
  price_note_public?: unknown;
  availability_public?: unknown;
  status?: unknown;
  reviewed_at?: unknown;
  published_at?: unknown;
  valid_until?: unknown;
};

export type RawSolidarityNeedRow = Record<string, unknown> & {
  id?: unknown;
  slug?: unknown;
  title?: unknown;
  public_summary?: unknown;
  need_type?: unknown;
  status?: unknown;
  visibility?: unknown;
  territory_id?: unknown;
  organization_territory_id?: unknown;
  due_at?: unknown;
};

export type RawSolidarityDirectoryRows = {
  territories: readonly RawSolidarityTerritoryRow[];
  organizations: readonly RawSolidarityOrganizationRow[];
  offers: readonly RawSolidarityOfferRow[];
  needs: readonly RawSolidarityNeedRow[];
};

const PUBLIC_LIMITATIONS = [
  "A Feirinha é uma superfície de descoberta, não um marketplace.",
  "Ofertas só aparecem depois de passar pelos gates de publicação do COMUN e deixam a projeção pública ao vencer.",
  "Necessidades publicadas não representam todas as necessidades do território.",
  "A presença de uma organização não mede capacidade, qualidade ou cobertura.",
  "Não há pedido, pagamento, contratação, ranking, avaliação ou chat nesta experiência.",
] as const;

const DEFERRED = {
  individualProducers:
    "COMUN_48_4_A1_INDIVIDUAL_PRODUCERS_DEFERRED_FIRST_CYCLE",
  publicWrites: "COMUN_48_4_A3_AUTHORIZED_ORGANIZATION_WRITES_AVAILABLE",
  exchange: "DEFERRED_UNTIL_EXPLICIT_CONSENT_FLOW",
} as const;

function asPublicText(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) return null;
  return normalized;
}

function asAllowlisted<T extends string>(value: unknown, values: readonly T[]) {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : null;
}

function asIsoDate(value: unknown) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

function projectTerritory(row: RawSolidarityTerritoryRow) {
  if (
    row.visibility !== "public" ||
    !asAllowlisted(row.status, PUBLIC_SOLIDARITY_TERRITORY_STATUSES) ||
    !asAllowlisted(row.verification_status, PUBLIC_SOLIDARITY_VERIFICATION_STATUSES)
  )
    return null;
  const territoryId = asPublicText(row.id, 80);
  const slug = asPublicText(row.slug, 120);
  if (!territoryId || !slug) return null;
  return {
    territoryId,
    slug,
    municipality: asPublicText(row.municipality, 160),
    neighborhoodLabel: asPublicText(row.neighborhood, 160),
    publicApproximateAddress: asPublicText(row.public_approximate_address, 300),
  } satisfies PublicSolidarityTerritoryV1;
}

function projectOrganization(
  row: RawSolidarityOrganizationRow,
  territory: PublicSolidarityTerritoryV1 | undefined,
) {
  const organizationStatus = asAllowlisted(
    row.status,
    PUBLIC_SOLIDARITY_ORGANIZATION_STATUSES,
  );
  const verificationStatus = asAllowlisted(
    row.verification_status,
    PUBLIC_SOLIDARITY_VERIFICATION_STATUSES,
  );
  const organizationType = asAllowlisted(row.organization_type, ORGANIZATION_TYPES);
  const publicName = asPublicText(row.public_name, 200);
  if (!territory || !organizationStatus || !verificationStatus || !organizationType || !publicName)
    return null;
  const services = Array.isArray(row.services_public)
    ? [...new Set(row.services_public.map((item) => asPublicText(item, 200)).filter((item): item is string => Boolean(item)))].slice(0, 20)
    : [];
  return {
    territoryId: territory.territoryId,
    slug: territory.slug,
    publicName,
    organizationType,
    organizationStatus,
    verificationStatus,
    presentation: asPublicText(row.presentation_public, 1200),
    services,
    serviceTerritory: asPublicText(row.service_territory_public, 300),
    publicContact: asPublicText(row.public_contact_authorized, 300),
    lastVerifiedAt: asIsoDate(row.last_verified_at),
    territory,
  } satisfies PublicSolidarityOrganizationV1;
}

function minimalOrganization(organization: PublicSolidarityOrganizationV1) {
  return {
    territoryId: organization.territoryId,
    slug: organization.slug,
    publicName: organization.publicName,
    organizationType: organization.organizationType,
  } satisfies PublicSolidarityOfferOrganizationV1;
}

function parsePrice(row: RawSolidarityOfferRow) {
  if (row.price_amount_cents == null && row.price_currency == null)
    return { amount: null, currency: null } as const;
  const amount =
    typeof row.price_amount_cents === "string" && /^\d+$/.test(row.price_amount_cents)
      ? Number(row.price_amount_cents)
      : row.price_amount_cents;
  if (
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    row.price_currency !== "BRL"
  )
    return null;
  return { amount, currency: "BRL" as const };
}

function projectOffer(
  row: RawSolidarityOfferRow,
  organizations: ReadonlyMap<string, PublicSolidarityOrganizationV1>,
  now: Date,
): PublicSolidarityOfferV1 | null {
  if (row.status !== "published") return null;
  const reviewedAt = asIsoDate(row.reviewed_at);
  const publishedAt = asIsoDate(row.published_at);
  const validUntil = asIsoDate(row.valid_until);
  if (
    !reviewedAt ||
    !publishedAt ||
    !validUntil ||
    Date.parse(validUntil) <= now.getTime() ||
    Date.parse(validUntil) <= Date.parse(publishedAt)
  )
    return null;
  const organizationId = asPublicText(row.organization_territory_id, 80);
  const organization = organizationId ? organizations.get(organizationId) : null;
  const id = asPublicText(row.id, 80);
  const slug = asPublicText(row.slug, 120);
  const title = asPublicText(row.title, 140);
  const summary = asPublicText(row.public_summary, 1200);
  const kind = asAllowlisted(row.offer_kind, SOLIDARITY_OFFER_KINDS);
  const modalities = Array.isArray(row.modalities)
    ? [...new Set(row.modalities.map((item) => asAllowlisted(item, SOLIDARITY_OFFER_MODALITIES)).filter((item): item is (typeof SOLIDARITY_OFFER_MODALITIES)[number] => Boolean(item)))]
    : [];
  const price = parsePrice(row);
  if (!organization || !id || !slug || !title || !summary || !kind || !modalities.length || !price)
    return null;
  return {
    id,
    slug,
    title,
    summary,
    kind,
    modalities,
    priceAmountCents: price.amount,
    priceCurrency: price.currency,
    priceNote: asPublicText(row.price_note_public, 300),
    availability: asPublicText(row.availability_public, 500),
    validUntil,
    organization: minimalOrganization(organization),
  } satisfies PublicSolidarityOfferV1;
}

function projectNeed(
  row: RawSolidarityNeedRow,
  territories: ReadonlyMap<string, PublicSolidarityTerritoryV1>,
  organizations: ReadonlyMap<string, PublicSolidarityOrganizationV1>,
) {
  const status = asAllowlisted(row.status, PUBLIC_SOLIDARITY_NEED_STATUSES);
  if (row.visibility !== "public" || !status) return null;
  const organizationId = asPublicText(row.organization_territory_id, 80);
  const territoryId = asPublicText(row.territory_id, 80);
  const organization = organizationId ? organizations.get(organizationId) : null;
  if (organizationId && !organization) return null;
  const territory = organization?.territory ?? (territoryId ? territories.get(territoryId) : null);
  if (!organization && !territory) return null;
  const id = asPublicText(row.id, 80);
  const slug = asPublicText(row.slug, 120);
  const title = asPublicText(row.title, 200);
  const summary = asPublicText(row.public_summary, 1200);
  const needType = asAllowlisted(row.need_type, SOLIDARITY_NEED_TYPES);
  if (!id || !slug || !title || !summary || !needType) return null;
  return {
    id,
    slug,
    title,
    summary,
    needType,
    status,
    dueAt: asIsoDate(row.due_at),
    organization: organization ? minimalOrganization(organization) : null,
    territory: territory ?? null,
  } satisfies PublicSolidarityNeedV1;
}

export function projectPublicSolidarityEconomyDirectory(
  rows: RawSolidarityDirectoryRows,
  options: { now?: Date; limit?: number } = {},
): PublicSolidarityEconomyDirectoryV1 {
  const now = options.now ?? new Date();
  const limit = options.limit ?? COMUN_SOLIDARITY_DIRECTORY_LIMIT;
  const territoryMap = new Map<string, PublicSolidarityTerritoryV1>();
  for (const row of rows.territories) {
    const territory = projectTerritory(row);
    if (territory) territoryMap.set(territory.territoryId, territory);
  }
  const organizationMap = new Map<string, PublicSolidarityOrganizationV1>();
  for (const row of rows.organizations) {
    const id = asPublicText(row.territory_id, 80);
    const organization = projectOrganization(row, id ? territoryMap.get(id) : undefined);
    if (organization) organizationMap.set(organization.territoryId, organization);
  }
  const organizations = [...organizationMap.values()]
    .sort((a, b) => a.publicName.localeCompare(b.publicName, "pt-BR"))
    .slice(0, limit);
  const visibleOrganizations = new Map(organizations.map((item) => [item.territoryId, item]));
  const offers = rows.offers
    .map((row) => projectOffer(row, visibleOrganizations, now))
    .filter((item): item is PublicSolidarityOfferV1 => Boolean(item))
    .sort((a, b) => Date.parse(a.validUntil) - Date.parse(b.validUntil) || a.title.localeCompare(b.title, "pt-BR"))
    .slice(0, limit);
  const needs = rows.needs
    .map((row) => projectNeed(row, territoryMap, visibleOrganizations))
    .filter((item): item is PublicSolidarityNeedV1 => Boolean(item))
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) return Date.parse(a.dueAt) - Date.parse(b.dueAt) || a.title.localeCompare(b.title, "pt-BR");
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return a.title.localeCompare(b.title, "pt-BR");
    })
    .slice(0, limit);
  const partial = [rows.organizations, rows.offers, rows.needs].some(
    (collection) => collection.length > limit,
  );
  return {
    contractVersion: COMUN_SOLIDARITY_ECONOMY_CONTRACT_VERSION,
    sourceKind: "reviewed_public_data",
    sourceState: "available",
    coverageState: partial ? "partial_due_to_safety_cap" : "complete_for_bounded_projection",
    organizations,
    offers,
    needs,
    limitations: PUBLIC_LIMITATIONS,
    deferred: DEFERRED,
  };
}

export function createUnavailableSolidarityEconomyDirectory(): PublicSolidarityEconomyDirectoryV1 {
  return {
    contractVersion: COMUN_SOLIDARITY_ECONOMY_CONTRACT_VERSION,
    sourceKind: "reviewed_public_data",
    sourceState: "unavailable",
    coverageState: "complete_for_bounded_projection",
    organizations: [],
    offers: [],
    needs: [],
    limitations: PUBLIC_LIMITATIONS,
    deferred: DEFERRED,
  };
}

export function formatSolidarityPriceBRL(amountCents: number | null) {
  if (amountCents == null) return null;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
