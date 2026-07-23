import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  clusterSidewalkRecords,
  distanceMeters,
  nearbySidewalkRecords,
  pointCoordinates,
  projectMercator,
  unprojectMercator,
} from "./sidewalk-map-config";

describe("adaptador cartográfico local das calçadas", () => {
  it("projeta e desfaz um ponto real sem trocar latitude e longitude", () => {
    const point: [number, number] = [-44.1042, -22.5202],
      screen = projectMercator(point),
      restored = unprojectMercator(screen.x, screen.y);
    expect(restored[0]).toBeCloseTo(point[0], 5);
    expect(restored[1]).toBeCloseTo(point[1], 5);
  });
  it("calcula proximidade métrica", () => {
    expect(
      distanceMeters([-44.1042, -22.5202], [-44.1042, -22.5193]),
    ).toBeGreaterThan(90);
    expect(
      distanceMeters([-44.1042, -22.5202], [-44.1042, -22.5193]),
    ).toBeLessThan(110);
  });
  it("usa somente geometria pública", () => {
    expect(
      pointCoordinates({ public_geometry_geojson: null } as any),
    ).toBeNull();
    expect(
      pointCoordinates({
        public_geometry_geojson: { type: "Point", coordinates: [-44.1, -22.5] },
      } as any),
    ).toEqual([-44.1, -22.5]);
  });
});

const record = (id: string, coordinates: [number, number]) => ({
  id,
  slug: id,
  name: id,
  public_geometry_geojson: { type: "Point" as const, coordinates },
  categories: [],
  condition: "bad" as const,
  forwarding_status: "no_action",
  verification_status: "verified",
  public_summary: "Fixture",
  approximate_location: null,
  neighborhood: null,
  last_observed_at: "2026-07-20T00:00:00Z",
  resolved_at: null,
});
it("agrupa marcadores próximos e abre os grupos conforme o zoom", () => {
  const records = [
    record("a", [-44.1042, -22.5202]),
    record("b", [-44.1039, -22.5201]),
    record("c", [-44.19, -22.58]),
  ];
  expect(clusterSidewalkRecords(records, 1)).toHaveLength(2);
  expect(clusterSidewalkRecords(records, 100)).toHaveLength(3);
});
it("ordena registros públicos no raio sem acessar geometria privada", () => {
  const records = [
    record("longe", [-44.12, -22.52]),
    record("perto", [-44.1043, -22.5202]),
  ];
  const result = nearbySidewalkRecords(records, [-44.1042, -22.5202], 100);
  expect(result.map((x) => x.record.id)).toEqual(["perto"]);
  expect(result[0].distance).toBeLessThan(20);
});

it("mantém o manifesto cartográfico portátil e sem diretórios pessoais", () => {
  const raw = readFileSync(
    resolve(process.cwd(), "public/maps/volta-redonda/manifest.json"),
    "utf8",
  );
  expect(raw).not.toMatch(/[A-Za-z]:\\\\/);
  expect(raw).not.toMatch(/\/(?:home|Users|mnt)\//);
  const manifest = JSON.parse(raw);
  expect(manifest.output.sizeBytes).toBeLessThanOrEqual(
    manifest.output.reviewLimitBytes,
  );
  expect(manifest.output.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.inputs.osm.attribution).toContain("OpenStreetMap");
  expect(manifest.inputs.ibge.attribution).toBe("IBGE");
});
