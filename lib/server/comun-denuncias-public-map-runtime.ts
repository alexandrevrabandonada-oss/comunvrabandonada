import "server-only";

import { createComunRelataPersistenceClient } from "../comun-relata-persistence";
import { isComunDenunciasPublicMapEnabled } from "../comun-denuncias-public-map-feature";
import {
  sanitizeComunRelataPublicProjection,
  type PublicProjectionRow,
} from "../comun-relata-public-projection";
import { resolveComunDenunciasMapReadinessFromPublicRows } from "../comun-denuncias-map-readiness";

export const COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

export type PublicDenunciasPublicProblem = ReturnType<
  typeof sanitizeComunRelataPublicProjection
>;
export type PublicDenunciasMapCase = Omit<
  PublicDenunciasPublicProblem,
  "category"
> & { category: string };

function sanitize(row: PublicProjectionRow) {
  const projected = sanitizeComunRelataPublicProjection(row);
  return { ...projected, category: projected.title };
}

async function listRawPublicMapRows(category?: string, limit = 100) {
  if (!isComunDenunciasPublicMapEnabled()) return null;
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_denuncias_public_list", {
    p_category: category ?? null,
    p_limit: limit,
  });
  if (error || !Array.isArray(data))
    throw new Error("COMUN_DENUNCIAS_PUBLIC_MAP_UNAVAILABLE");
  return data as PublicProjectionRow[];
}

export async function listComunDenunciasPublicMapCases(category?: string) {
  const rows = await listRawPublicMapRows(category);
  return rows?.map(sanitize) ?? null;
}

export async function getComunDenunciasPublicMapReadiness() {
  const featureEnabled = isComunDenunciasPublicMapEnabled();
  const rows = featureEnabled ? await listRawPublicMapRows(undefined, 100) : [];
  return resolveComunDenunciasMapReadinessFromPublicRows(
    rows ?? [],
    featureEnabled,
  );
}

export async function getComunDenunciasPublicMapProblem(
  publicId: string,
): Promise<PublicDenunciasPublicProblem | null> {
  if (!isComunDenunciasPublicMapEnabled()) return null;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      publicId,
    )
  )
    return null;
  const db = createComunRelataPersistenceClient();
  const { data, error } = await db.rpc("comun_denuncias_public_get", {
    p_public_id: publicId,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  try {
    const projected = sanitizeComunRelataPublicProjection(
      row as PublicProjectionRow,
    );
    return projected.projectionState === "active" ? projected : null;
  } catch {
    return null;
  }
}
