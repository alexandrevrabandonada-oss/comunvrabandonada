import { NextResponse } from "next/server";
import { isComunObservatoryEssentialPowerInterruptionEnabled } from "@/lib/comun-observatory-feature";
import { getPowerInterruptionSummaryDto } from "@/lib/comun-essential-power-interruption-observatory";

export const runtime = "nodejs";
const headers = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" };
const noStore = { "cache-control": "no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore });
const methodNotAllowed = () => NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStore, allow: "GET, HEAD" } });
export function GET() { return isComunObservatoryEssentialPowerInterruptionEnabled() ? NextResponse.json(getPowerInterruptionSummaryDto(), { headers }) : dormant(); }
export function HEAD() { return isComunObservatoryEssentialPowerInterruptionEnabled() ? new NextResponse(null, { headers }) : new NextResponse(null, { status: 404, headers: noStore }); }
export const POST = methodNotAllowed; export const PUT = methodNotAllowed; export const PATCH = methodNotAllowed; export const DELETE = methodNotAllowed; export const OPTIONS = methodNotAllowed;
