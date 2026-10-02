"use client";

import { ComunSidewalkObservatory } from "@/components/comun-sidewalk-observatory";
import { realBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import type {
  ObservatorySourceDescriptor,
  PublicObservation,
} from "@/lib/comun-observatory";

// Synthetic public DTOs for component integration only. No database, review,
// consent or publication is claimed. This route exists only in disposable CI.
const source: ObservatorySourceDescriptor = {
  id: "local-rendering-fixture",
  observatoryId: "sidewalks",
  label: "LOCAL TEST FIXTURE — NOT EDITORIAL CONTENT",
  sourceKind: "reviewed_community_projection",
  publisher: "Disposable CI fixture",
  sourceReference: "Synthetic DTO contract test",
  sourceUrl: "/maplibre-observatory-test",
  methodology: "Synthetic fixtures only",
  observedPeriod: null,
  updatedAt: null,
  reviewedAt: "2026-10-02",
  freshness: "unknown",
  geographyLevel: "reviewed_public_point",
  licenseOrReuseNote: "Test fixture",
  qualityState: "experimental",
  publicSafe: true,
  automaticPublicationAllowed: false,
};
const observations: PublicObservation[] = [
  { condition: "bad" as const, point: [-44.1, -22.52] as [number, number] },
  { condition: "good" as const, point: [-44.12, -22.5] as [number, number] },
].map(({ condition, point }, index) => ({
  id: `local-fixture-${index}`,
  observatoryId: "sidewalks",
  kind: "sidewalk_condition",
  label: "Synthetic DTO",
  value: 1,
  unit: null,
  attributes: { condition, problems: ["hole"] },
  period: { observedAt: "2026-09-01T00:00:00.000Z", updatedAt: null },
  geography: {
    level: "reviewed_public_point",
    geometry: { type: "Point", coordinates: point },
  },
  source,
  quality: "experimental",
  freshness: "unknown",
  methodologyVersion: "local-test",
}));

export default function ObservatoryFixture() {
  return (
    <>
      <p role="note">LOCAL TEST FIXTURE — NOT EDITORIAL CONTENT</p>
      <ComunSidewalkObservatory
        observations={observations}
        source={source}
        coverageState="complete_for_public_projection"
        initialFilters={{ condition: null, problem: null, period: null }}
        provider={realBasemapProvider}
      />
    </>
  );
}
