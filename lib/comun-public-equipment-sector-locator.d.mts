import type { TerritorialPublicGeometry } from "./comun-environment-territorial-base";

export type SectorLocatorInput = {
  sectorCode: string;
  geography: { geometry: TerritorialPublicGeometry };
};

export type SectorLocatorResult =
  | { state: "matched"; sectorCode: string }
  | { state: "boundary_ambiguous" }
  | { state: "outside_or_geometry_gap" };

export function locateOfficialPointInTerritorialSector(
  point: { latitude: number; longitude: number },
  sectors: readonly SectorLocatorInput[],
): SectorLocatorResult;
