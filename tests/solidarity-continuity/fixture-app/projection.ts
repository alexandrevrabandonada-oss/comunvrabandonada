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
