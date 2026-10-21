import "server-only";
import { readPublicArchiveItems } from "@/lib/archive";
import { readPublicRadio } from "@/lib/radio";
import { getPublicSolidarityEconomyDirectory } from "./comun-solidarity-economy-directory";
import { isComunSolidarityEconomyPublicCoreEnabled } from "@/lib/comun-solidarity-economy";
import { isComunSolidarityOrganizationGovernanceEnabled } from "@/lib/comun-solidarity-organization-governance";
import {
  archiveDiscovery,
  radioDiscovery,
  solidarityDiscovery,
  type DiscoverySource,
} from "@/lib/comun-public-discovery";
async function bounded(
  read: () => Promise<DiscoverySource>,
  kind: DiscoverySource["kind"],
): Promise<DiscoverySource> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read(),
      new Promise<DiscoverySource>((resolve) => {
        timer = setTimeout(
          () => resolve({ kind, state: "unavailable", items: [] }),
          3000,
        );
      }),
    ]);
  } catch {
    return { kind, state: "unavailable", items: [] };
  } finally {
    clearTimeout(timer);
  }
}
export async function readPublicDiscovery(): Promise<DiscoverySource[]> {
  return Promise.all([
    bounded(
      async () => archiveDiscovery(await readPublicArchiveItems()),
      "acervo",
    ),
    bounded(async () => radioDiscovery(await readPublicRadio()), "radio"),
    bounded(async () => {
      const enabled =
        isComunSolidarityEconomyPublicCoreEnabled() &&
        isComunSolidarityOrganizationGovernanceEnabled();
      return solidarityDiscovery(
        enabled
          ? await getPublicSolidarityEconomyDirectory()
          : { sourceState: "unavailable", offers: [], needs: [] },
        enabled,
      );
    }, "feirinha"),
  ]);
}
