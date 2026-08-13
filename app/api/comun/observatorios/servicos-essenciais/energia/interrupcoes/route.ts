import { NextResponse } from "next/server";
import { isComunObservatoryEssentialPowerInterruptionEnabled } from "@/lib/comun-observatory-feature";
import { getPowerInterruptionRecordsPage, PowerInterruptionQueryError } from "@/lib/comun-essential-power-interruption-observatory";

export const runtime = "nodejs";
const headers = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" };
const noStore = { "cache-control": "no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore });
const methodNotAllowed = () => NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStore, allow: "GET, HEAD" } });
export function GET(request: Request) {
  if (!isComunObservatoryEssentialPowerInterruptionEnabled()) return dormant();
  const params = new URL(request.url).searchParams;
  const query = Object.fromEntries(["month", "set", "origin", "type", "cause", "cursor", "limit"].map((key) => {
    const values = params.getAll(key);
    return [key, values.length <= 1 ? values[0] : values];
  }));
  try { return NextResponse.json(getPowerInterruptionRecordsPage(query), { headers }); }
  catch (error) { return error instanceof PowerInterruptionQueryError ? NextResponse.json({ code: error.code }, { status: 400, headers: noStore }) : NextResponse.json({ code: "source_unavailable" }, { status: 503, headers: noStore }); }
}
export function HEAD() { return isComunObservatoryEssentialPowerInterruptionEnabled() ? new NextResponse(null, { headers }) : new NextResponse(null, { status: 404, headers: noStore }); }
export const POST = methodNotAllowed; export const PUT = methodNotAllowed; export const PATCH = methodNotAllowed; export const DELETE = methodNotAllowed; export const OPTIONS = methodNotAllowed;
