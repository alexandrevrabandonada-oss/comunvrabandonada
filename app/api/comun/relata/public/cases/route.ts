import { NextRequest, NextResponse } from "next/server";
import { listLocalPublicProjections, COMUN_RELATA_PUBLIC_NO_STORE } from "@/lib/comun-relata-public-runtime";

function fail(code = "public_map_unavailable") {
  return NextResponse.json({ code }, { status: 404, headers: COMUN_RELATA_PUBLIC_NO_STORE });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get("category") ?? undefined;
  const state = params.get("state") ?? "visible_local_preview";
  const limit = Number(params.get("limit") ?? "100");
  if (category && !["public_lighting", "power_distribution", "smoke_or_environmental_trace"].includes(category)) return fail("public_filter_invalid");
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) return fail("public_limit_invalid");
  if (!["visible_local_preview", "eligible_auto_local", "review_required", "suppressed", "inactive"].includes(state)) return fail("public_state_invalid");
  const bbox = params.get("bbox");
  if (bbox) {
    const values = bbox.split(",").map(Number);
    if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[0] < -180 || values[2] > 180 || values[1] < -90 || values[3] > 90 || values[0] > values[2] || values[1] > values[3]) return fail("public_bbox_invalid");
  }
  try {
    const rows = await listLocalPublicProjections({ category, state, limit });
    if (!rows) return fail();
    const filtered = bbox
      ? (() => { const [west, south, east, north] = bbox.split(",").map(Number); return rows.filter((row) => row.location.longitude >= west && row.location.longitude <= east && row.location.latitude >= south && row.location.latitude <= north); })()
      : rows;
    return NextResponse.json({ policyVersion: "relata-public-projection-v1", cases: filtered, nextCursor: null }, { headers: COMUN_RELATA_PUBLIC_NO_STORE });
  } catch { return fail(); }
}

