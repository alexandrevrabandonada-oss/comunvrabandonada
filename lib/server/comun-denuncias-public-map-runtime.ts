import "server-only";

import { createComunRelataPersistenceClient } from "../comun-relata-persistence";
import { isComunDenunciasPublicMapEnabled } from "../comun-denuncias-public-map-feature";

export const COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

type ProjectionRow = {
  public_id: string;
  category: string;
  community_state: string;
  report_count: number;
  confirmation_count: number;
  first_seen_date: string;
  last_activity_date: string;
  public_latitude: number;
  public_longitude: number;
  uncertainty_radius_meters: number;
  policy_version: string;
  eligibility_reason: string;
  projection_state: string;
  created_at: string;
  updated_at: string;
};

function sanitize(row: ProjectionRow) {
  const label = {
    public_lighting: "Iluminação pública no território",
    power_distribution: "Distribuição de energia no território",
    smoke_or_environmental_trace: "Vestígio ambiental no território",
  }[row.category] ?? "Problema organizado no território";
  return {
    publicId: row.public_id,
    category: label,
    title: label,
    summary: "Há relatos organizados sobre este tipo de problema em uma área aproximada.",
    reportCount: row.report_count,
    confirmationCount: row.confirmation_count,
    firstObservedDate: row.first_seen_date,
    lastActivityDate: row.last_activity_date,
    location: {
      latitude: row.public_latitude,
      longitude: row.public_longitude,
      uncertaintyRadiusMeters: row.uncertainty_radius_meters,
    },
  };
}

export async function listComunDenunciasPublicMapCases(category?: string) {
  if (!isComunDenunciasPublicMapEnabled()) return null;
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_denuncias_public_list", {
    p_category: category ?? null,
    p_limit: 100,
  });
  if (error || !Array.isArray(data)) throw new Error("COMUN_DENUNCIAS_PUBLIC_MAP_UNAVAILABLE");
  return (data as ProjectionRow[]).map(sanitize);
}
