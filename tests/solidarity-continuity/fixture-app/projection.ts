import { publicDetail } from "./world";
export async function getPublicSolidarityOrganizationDetail(slug: string) {
  return slug === "organizacao-lab" ? publicDetail() : null;
}
export async function getMySolidarityOrganizationAccess() {
  return null;
}
export async function listSolidarityOrganizationGovernance() {
  return [];
}

export async function getPublicSolidarityEconomyDirectory() {
  const detail = publicDetail();
  return {
    contractVersion: "synthetic",
    sourceKind: "reviewed_public_data",
    sourceState: "available",
    coverageState: "complete_for_bounded_projection",
    organizations: detail ? [detail.organization] : [],
    offers: detail?.offers ?? [],
    needs: detail?.needs ?? [],
    limitations: ["Fixture sintética: não comprova operação pública."],
    deferred: [],
  };
}
