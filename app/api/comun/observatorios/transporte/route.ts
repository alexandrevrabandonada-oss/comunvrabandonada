import { NextResponse } from "next/server";
import { COMUN_TRANSPORT_SNAPSHOT, getTransportOperators, getTransportProgrammedNetworkPublicDto } from "@/lib/comun-transport-programmed-network";
import { getTransportSystemMetricsPublicResponse } from "@/lib/comun-transport-system-metrics";
import { isComunObservatoryTransportProgrammedEnabled, isComunObservatoryTransportSystemMetricsEnabled } from "@/lib/comun-observatory-feature";
export const runtime = "nodejs";
const publicHeaders = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" }; const noStore = { "cache-control": "no-store, max-age=0" };
function dormant() { return NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore }); }
function denied() { return NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStore, allow: "GET, HEAD" } }); }
export function GET() { if (!isComunObservatoryTransportProgrammedEnabled()) return dormant(); return NextResponse.json({ ...getTransportProgrammedNetworkPublicDto(), operators: getTransportOperators(), lines: COMUN_TRANSPORT_SNAPSHOT.lines.map(({ servicePatterns, itineraryVariants, notes, ...line }) => line), ...(isComunObservatoryTransportSystemMetricsEnabled() ? { systemMetrics: getTransportSystemMetricsPublicResponse() } : {}) }, { headers: publicHeaders }); }
export function HEAD() { return isComunObservatoryTransportProgrammedEnabled() ? new NextResponse(null, { status: 200, headers: publicHeaders }) : new NextResponse(null, { status: 404, headers: noStore }); }
export const POST = denied; export const PUT = denied; export const PATCH = denied; export const DELETE = denied; export const OPTIONS = denied;
