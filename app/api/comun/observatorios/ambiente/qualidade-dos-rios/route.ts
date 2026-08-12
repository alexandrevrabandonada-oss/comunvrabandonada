import { NextResponse } from "next/server";
import { isComunObservatoryEnvironmentSurfaceWaterEnabled } from "@/lib/comun-observatory-feature";
import { getSurfaceWaterObservatoryPublicDto } from "@/lib/comun-observatory-surface-water";
export const runtime = "nodejs";
const publicHeaders = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" };
const noStore = { "cache-control": "no-store, max-age=0" };
const dormant = () => NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore });
const methodNotAllowed = () => NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStore, allow: "GET, HEAD" } });
export function GET() { return isComunObservatoryEnvironmentSurfaceWaterEnabled() ? NextResponse.json(getSurfaceWaterObservatoryPublicDto(), { headers: publicHeaders }) : dormant(); }
export function HEAD() { return isComunObservatoryEnvironmentSurfaceWaterEnabled() ? new NextResponse(null, { status: 200, headers: publicHeaders }) : new NextResponse(null, { status: 404, headers: noStore }); }
export const POST = methodNotAllowed; export const PUT = methodNotAllowed; export const PATCH = methodNotAllowed; export const DELETE = methodNotAllowed; export const OPTIONS = methodNotAllowed;
