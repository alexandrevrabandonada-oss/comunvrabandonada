import { NextResponse } from "next/server";
import { isComunObservatoryTerritorialContextEnabled } from "@/lib/comun-observatory-feature";
import { getTerritorialContextPublicDto } from "@/lib/comun-observatory-territorial-context";

export const runtime = "nodejs";
const publicHeaders = { "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600", vary: "Accept" };
const noStoreHeaders = { "cache-control": "no-store, max-age=0" };
function dormant() { return NextResponse.json({ code: "not_found" }, { status: 404, headers: noStoreHeaders }); }
function methodNotAllowed() { return NextResponse.json({ code: "method_not_allowed" }, { status: 405, headers: { ...noStoreHeaders, allow: "GET, HEAD" } }); }
export function GET() { return isComunObservatoryTerritorialContextEnabled() ? NextResponse.json(getTerritorialContextPublicDto(), { headers: publicHeaders }) : dormant(); }
export function HEAD() { return isComunObservatoryTerritorialContextEnabled() ? new NextResponse(null, { status: 200, headers: publicHeaders }) : new NextResponse(null, { status: 404, headers: noStoreHeaders }); }
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
