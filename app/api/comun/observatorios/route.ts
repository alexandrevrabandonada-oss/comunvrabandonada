import { NextResponse } from "next/server";
import {
  isComunObservatoriesFoundationEnabled,
  isComunObservatorySidewalkAdapterEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTransportProgrammedEnabled,
  isComunObservatoryTerritorialContextEnabled,
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoryEssentialPowerInterruptionEnabled,
} from "@/lib/comun-observatory-feature";
import { getPublicObservatoryRegistry } from "@/lib/comun-observatory";

export const runtime = "nodejs";

const publicHeaders = {
  "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
  vary: "Accept",
};
const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

function dormant() {
  return NextResponse.json(
    { code: "not_found" },
    { status: 404, headers: noStoreHeaders },
  );
}

function methodNotAllowed() {
  return NextResponse.json(
    { code: "method_not_allowed" },
    { status: 405, headers: { ...noStoreHeaders, allow: "GET, HEAD" } },
  );
}

export function GET() {
  if (!isComunObservatoriesFoundationEnabled()) return dormant();
  return NextResponse.json(
    {
      methodologyVersion: "comun-observatory-foundation-v1",
      observatories: getPublicObservatoryRegistry(
        isComunObservatorySidewalkAdapterEnabled(),
        isComunObservatorySidewalkAnalyticsEnabled(),
        isComunObservatoryTransportProgrammedEnabled(),
        isComunObservatoryTerritorialContextEnabled(),
        isComunObservatoryEnvironmentSurfaceWaterEnabled(),
        isComunObservatoryEssentialPowerInterruptionEnabled(),
      ),
    },
    { headers: publicHeaders },
  );
}

export function HEAD() {
  if (!isComunObservatoriesFoundationEnabled()) {
    return new NextResponse(null, { status: 404, headers: noStoreHeaders });
  }
  return new NextResponse(null, { status: 200, headers: publicHeaders });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
