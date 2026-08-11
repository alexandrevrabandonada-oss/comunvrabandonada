import { NextResponse } from "next/server";
import { isComunObservatorySidewalkAdapterEnabled } from "@/lib/comun-observatory-feature";
import { getSidewalkReviewedProjectionForObservatory } from "@/lib/comun-observatory-sidewalk-adapter";

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
  return NextResponse.json(
    {
      observatoryId: "sidewalks",
      source: projection.source,
      indicators: [
        {
          id: "reviewed-sidewalk-points",
          label: "Pontos revisados",
          value: projection.observations.length,
          unit: "pontos",
        },
      ],
      observations: projection.observations,
    },
    { headers: publicHeaders },
  );
}

export function HEAD() {
  if (!isComunObservatorySidewalkAdapterEnabled()) return new NextResponse(null, { status: 404, headers: noStoreHeaders });
  return new NextResponse(null, { status: 200, headers: publicHeaders });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
