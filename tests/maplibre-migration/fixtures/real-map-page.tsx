"use client";
import { Suspense, useState } from "react";
import { SidewalkRealMap } from "@/components/sidewalk-real-map";
import { realBasemapProvider } from "@/lib/sidewalk-basemap-provider";
import type { PublicSidewalkRecord } from "@/lib/sidewalk-map-config";

// Synthetic DTOs only. Installed solely in the disposable CI build.
// No real contributions, consent, review, publication or personnel are claimed.
const initialRecords: PublicSidewalkRecord[] = [
  {
    id: "fixture-a",
    condition: "bad",
    coordinates: [-44.1, -22.52],
    name: "Trecho sintético A",
  },
  {
    id: "fixture-b",
    condition: "good",
    coordinates: [-44.12, -22.5],
    name: "Trecho sintético B",
  },
].map(({ id, condition, coordinates, name }) => ({
  id,
  slug: id,
  condition: condition as PublicSidewalkRecord["condition"],
  name,
  public_geometry_geojson: { type: "Point", coordinates },
  categories: ["buraco"],
  forwarding_status: "no_action",
  verification_status: "fixture",
  public_summary: "Resumo sintético original",
  approximate_location: null,
  neighborhood: null,
  last_observed_at: "2026-09-01T00:00:00.000Z",
  resolved_at: null,
}));
export default function RealMapFixture() {
  const [records, setRecords] = useState(initialRecords);
  return (
    <>
      <p role="note">LOCAL TEST FIXTURE — NOT EDITORIAL CONTENT</p>
      <button
        onClick={() =>
          setRecords((current) =>
            current.map((record) =>
              record.id === "fixture-a"
                ? {
                    ...record,
                    name: "Trecho sintético atualizado",
                    public_summary: "Resumo sintético atualizado",
                  }
                : record,
            ),
          )
        }
      >
        Atualizar registro sintético
      </button>
      <button
        onClick={() =>
          setRecords((current) =>
            current.filter((record) => record.id !== "fixture-a"),
          )
        }
      >
        Remover registro sintético
      </button>
      <Suspense fallback={<p>Carregando fixture local</p>}>
        <SidewalkRealMap records={records} provider={realBasemapProvider} />
      </Suspense>
    </>
  );
}
