import type { PublicSolidarityOrganizationV1 } from "@/lib/comun-solidarity-economy";
export const ids = {
  a: "a5000000-0000-4000-8000-000000000001",
  b: "a5000000-0000-4000-8000-000000000002",
  editor: "a5000000-0000-4000-8000-000000000003",
  org: "a5000000-0000-4000-8000-000000000011",
  offer: "a5000000-0000-4000-8000-000000000021",
  need: "a5000000-0000-4000-8000-000000000022",
};
export const organization: PublicSolidarityOrganizationV1 = {
  territoryId: ids.org,
  slug: "organizacao-lab",
  publicName: "Organização sintética",
  organizationType: "cooperative",
  organizationStatus: "active",
  verificationStatus: "verified",
  presentation: "Ensaio sintético",
  services: [],
  serviceTerritory: null,
  publicContact: null,
  lastVerifiedAt: null,
  territory: {
    territoryId: ids.org,
    slug: "organizacao-lab",
    municipality: null,
    neighborhoodLabel: null,
    publicApproximateAddress: null,
  },
};
export const offer = {
  id: ids.offer,
  slug: "oferta-lab",
  title: "Oferta sintética de livros",
  summary: "Livros disponíveis para consulta",
  kind: "product",
  modalities: ["donation"],
  priceAmountCents: null,
  priceCurrency: null,
  priceNote: null,
  availability: null,
  validUntil: "2099-01-01T00:00:00Z",
  organization,
};
export const need = {
  id: ids.need,
  slug: "necessidade-lab",
  title: "Ajuda sintética com livros",
  summary: "Organizar uma pequena biblioteca",
  needType: "volunteering",
  status: "open",
  dueAt: null,
  organization,
  territory: null,
};
type Row = Record<string, any>;
const globalWorld = globalThis as typeof globalThis & {
  __socD08?: {
    rows: Row[];
    logouts: number;
    logoutFails: boolean;
    signins: number;
    published: boolean;
    eligible: boolean;
    logins: Record<string, string>;
  };
};
export const world = () =>
  (globalWorld.__socD08 ??= {
    rows: [],
    logouts: 0,
    logoutFails: false,
    signins: 0,
    published: true,
    eligible: true,
    logins: {},
  });
export function publicDetail() {
  return world().eligible
    ? {
        organization,
        offers: world().published ? [offer] : [],
        needs: world().published ? [need] : [],
        limitations: [],
      }
    : null;
}
