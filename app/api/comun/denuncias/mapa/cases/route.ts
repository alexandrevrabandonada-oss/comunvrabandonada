import { NextRequest, NextResponse } from "next/server";
import {
  COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE,
  listComunDenunciasPublicMapCases,
} from "@/lib/server/comun-denuncias-public-map-runtime";

const allowed = new Set(["public_lighting", "power_distribution", "smoke_or_environmental_trace"]);

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  if (category && !allowed.has(category)) {
    return NextResponse.json({ code: "public_map_filter_invalid" }, { status: 404, headers: COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE });
  }
  try {
    const cases = await listComunDenunciasPublicMapCases(category);
    if (!cases) return NextResponse.json({ code: "public_map_unavailable" }, { status: 404, headers: COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE });
    return NextResponse.json({ cases }, { headers: COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE });
  } catch {
    return NextResponse.json({ code: "public_map_unavailable" }, { status: 404, headers: COMUN_DENUNCIAS_PUBLIC_MAP_NO_STORE });
  }
}
