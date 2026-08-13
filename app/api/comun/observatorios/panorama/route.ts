import { NextResponse } from "next/server";
import {
  isComunObservatoryCityPanoramaEnabled,
  isComunObservatoryEnvironmentSurfaceWaterEnabled,
  isComunObservatoryEssentialPowerInterruptionEnabled,
  isComunObservatorySidewalkAnalyticsEnabled,
  isComunObservatoryTerritorialContextEnabled,
  isComunObservatoryTransportProgrammedEnabled,
  isComunObservatoryTransportSystemMetricsEnabled,
} from "@/lib/comun-observatory-feature";
import { getCityPanoramaPublicDto } from "@/lib/comun-city-panorama";

export const runtime = "nodejs";
const publicHeaders = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" };
const noStore = { "cache-control": "no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore });
const methodNotAllowed = () => NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStore, allow: "GET, HEAD" } });

function inputs() {
  return {
    territorialContextEnabled: isComunObservatoryTerritorialContextEnabled(),
    sidewalkAnalyticsEnabled: isComunObservatorySidewalkAnalyticsEnabled(),
    transportProgrammedEnabled: isComunObservatoryTransportProgrammedEnabled(),
    transportSystemMetricsEnabled: isComunObservatoryTransportSystemMetricsEnabled(),
    surfaceWaterEnabled: isComunObservatoryEnvironmentSurfaceWaterEnabled(),
    essentialPowerInterruptionEnabled: isComunObservatoryEssentialPowerInterruptionEnabled(),
  };
}

export async function GET() { return isComunObservatoryCityPanoramaEnabled() ? NextResponse.json(await getCityPanoramaPublicDto(inputs()), { headers: publicHeaders }) : dormant(); }
export function HEAD() { return isComunObservatoryCityPanoramaEnabled() ? new NextResponse(null, { headers: publicHeaders }) : new NextResponse(null, { status: 404, headers: noStore }); }
export const POST = methodNotAllowed; export const PUT = methodNotAllowed; export const PATCH = methodNotAllowed; export const DELETE = methodNotAllowed; export const OPTIONS = methodNotAllowed;
