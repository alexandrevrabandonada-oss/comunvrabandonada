import { NextResponse } from "next/server";
import {
  isComunObservatorySidewalkAdapterEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
} from "@/lib/comun-observatory-feature";
import {
  getSidewalkReviewedProjectionForObservatory,
  SIDEWALK_OBSERVATORY_SAFETY_CAP,
} from "@/lib/comun-observatory-sidewalk-adapter";
import { COMUN_OBSERVATORY_METHODOLOGY_VERSION } from "@/lib/comun-observatory";
import {
  deriveSidewalkObservatoryIndicators,
  presentSidewalkConditionFacets,
  presentSidewalkProblemFacets,
} from "@/lib/comun-sidewalk-observatory";

export const runtime = "nodejs";

const publicHeaders = {
  "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  vary: "Accept",
};
const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

function dormant() {
  return NextResponse.json({ code: "not_found" }, { status: 404, headers: noStoreHeaders });
}

function methodNotAllowed() {
  return NextResponse.json(
    { code: "method_not_allowed" },
    { status: 405, headers: { ...noStoreHeaders, allow: "GET, HEAD" } },
  );
}

export async function GET() {
  if (!isComunObservatorySidewalkAdapterEnabled()) return dormant();
  const projection = await getSidewalkReviewedProjectionForObservatory();
  if (!projection.available) {
    return NextResponse.json(
      { code: "source_unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  if (!isComunObservatorySidewalkAnalyticsEnabled()) {
    const partial = projection.coverageState === "partial_due_to_safety_cap";
    return NextResponse.json(
      {
        observatoryId: "sidewalks",
        source: projection.source,
        indicators: [
          {
            id: "reviewed-sidewalk-points",
            label: "Pontos revisados",
            value: partial
              ? `mais de ${projection.observations.length}`
              : projection.observations.length,
            unit: "pontos",
          },
        ],
        observations: projection.observations,
      },
      { headers: publicHeaders },
    );
  }

  const indicators = deriveSidewalkObservatoryIndicators(
    projection.observations,
    projection.coverageState,
  );
  return NextResponse.json(
    {
      observatoryId: "sidewalks",
      methodologyVersion: COMUN_OBSERVATORY_METHODOLOGY_VERSION,
      source: projection.source,
      coverage: {
        state: projection.coverageState,
        loadedCount: projection.observations.length,
        safetyCap: SIDEWALK_OBSERVATORY_SAFETY_CAP,
        qualityState: projection.source.qualityState,
        diagnostics: projection.qualityDiagnostics,
      },
      indicators,
      facets: {
        conditions: presentSidewalkConditionFacets(indicators),
        problems: presentSidewalkProblemFacets(indicators),
      },
      observations: projection.observations,
    },
    { headers: publicHeaders },
  );
}

export function HEAD() {
  if (!isComunObservatorySidewalkAdapterEnabled()) {
    return new NextResponse(null, { status: 404, headers: noStoreHeaders });
  }
  return new NextResponse(null, { status: 200, headers: publicHeaders });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
