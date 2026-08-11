import fixture125 from "@/data/comun/transport/fixtures/timetable-125.json";
import fixture205A from "@/data/comun/transport/fixtures/timetable-205a.json";
import fixture210 from "@/data/comun/transport/fixtures/timetable-210.json";
import fixture230 from "@/data/comun/transport/fixtures/itinerary-230.json";
import { describe, expect, it } from "vitest";
import {
  COMUN_TRANSPORT_ACTIVE_SNAPSHOT,
  COMUN_TRANSPORT_OFFICIAL_DOMAINS,
  COMUN_TRANSPORT_SNAPSHOT,
  COMUN_TRANSPORT_SOURCE_MANIFEST,
  deriveScheduledGaps,
  findTransportLines,
  getTransportLine,
  type Departure,
  type ItineraryVariant,
  type ServicePattern,
  validateTransportProgrammedNetwork,
} from "./comun-transport-programmed-network";
import {
  parseAuditedItineraryFixture,
  parseAuditedTimetableFixture,
} from "./comun-transport-source-parser";

const timetableFixtures = [fixture125, fixture205A, fixture210] as unknown as Array<{
  lineCode: string;
  patterns: ServicePattern[];
}>;

describe("transport programmed network C1", () => {
  it("accepts only a complete public contract with official sources", () => {
    expect(validateTransportProgrammedNetwork()).toEqual({ ok: true, errors: [] });
    expect(COMUN_TRANSPORT_SNAPSHOT.lineCount).toBe(48);
    expect(new Set(COMUN_TRANSPORT_SNAPSHOT.lines.map((line) => line.id)).size).toBe(48);
    expect(new Set(COMUN_TRANSPORT_SOURCE_MANIFEST.sources.map((source) => source.sourceId)).size).toBe(
      COMUN_TRANSPORT_SOURCE_MANIFEST.sources.length,
    );
    for (const source of COMUN_TRANSPORT_SOURCE_MANIFEST.sources) {
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(COMUN_TRANSPORT_OFFICIAL_DOMAINS).toContain(new URL(source.officialUrl).hostname);
    }
    expect(COMUN_TRANSPORT_ACTIVE_SNAPSHOT).toMatchObject({
      activeSnapshotId: "comun-transport-programmed-network-v2-20260811",
      previousSnapshotId: "comun-transport-programmed-network-v1-20260811",
    });
    expect(COMUN_TRANSPORT_SOURCE_MANIFEST.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "pmvr-bus-catalog-20260811", status: "superseded" }),
      expect.objectContaining({ sourceId: "pmvr-bus-catalog-20260811-r1", status: "active", semanticSha256: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    ]));
  });

  it("keeps operator versioned as an attribute, never as a line identity", () => {
    const line = getTransportLine("205a");
    expect(line).toMatchObject({ id: "municipal:205A", operator: "Viação Elite" });
    expect(line?.id).not.toContain("Elite");
  });

  it("keeps source gaps visible rather than filling in a timetable", () => {
    expect(getTransportLine("100")).toMatchObject({
      timetableStatus: "not_normalized",
      itineraryStatus: "not_normalized",
      servicePatterns: [],
    });
    expect(getTransportLine("205A")?.timetableStatus).toBe("partial");
  });

  it("normalizes searches only over the public catalog", () => {
    expect(findTransportLines("tres pocos").map((line) => line.lineCode)).toContain("210");
    expect(findTransportLines("viação pinheiral").every((line) => line.operator === "Viação Pinheiral")).toBe(true);
  });

  it("preserves the after-midnight 210 departure in chronological service order", () => {
    const pattern = getTransportLine("210")?.servicePatterns[0];
    expect(pattern?.departures.at(-1)).toMatchObject({ time: "00:20", serviceDayOffset: 1, variantCode: "B" });
    expect(deriveScheduledGaps(pattern?.departures ?? [])).toMatchObject({ first: "21:00", last: "00:20", count: 4 });
  });

  it("uses only minimal golden fixtures and fails closed on a malformed schedule", () => {
    timetableFixtures.forEach((fixture) => {
      expect(parseAuditedTimetableFixture(fixture)).toMatchObject({ ok: true, errors: [] });
    });
    expect(parseAuditedItineraryFixture(fixture230 as unknown as { lineCode: string; variants: ItineraryVariant[] })).toMatchObject({ ok: true, errors: [] });
    expect(
      parseAuditedTimetableFixture({
        lineCode: "210",
        patterns: [{ ...timetableFixtures[2].patterns[0], departures: [...timetableFixtures[2].patterns[0].departures].reverse() as Departure[] }],
      }),
    ).toMatchObject({ ok: false, patterns: [] });
  });

  it("does not package any private domain or operational transport wording", () => {
    const serialized = JSON.stringify({
      network: COMUN_TRANSPORT_SNAPSHOT,
      sources: COMUN_TRANSPORT_SOURCE_MANIFEST,
    }).toLowerCase();
    [
      "private.comun_relata_reports",
      "comun_bus_relata_intakes",
      "forwarding_packages",
      "wallet",
      "waiting_session",
      "private_exact_location_sentinel",
    ].forEach((forbidden) => expect(serialized).not.toContain(forbidden));
  });
});
