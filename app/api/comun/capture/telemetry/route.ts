import { NextRequest, NextResponse } from "next/server";
import { isComunQuickCaptureEnabled } from "@/lib/comun-capture-feature";
import { createComunRelataPersistenceClient } from "@/lib/comun-relata-persistence";

export const runtime = "nodejs";
const noStore = { "cache-control": "no-store, max-age=0" };

export async function POST(request: NextRequest) {
  if (!isComunQuickCaptureEnabled()) return NextResponse.json({ code: "not_found" }, { status: 404, headers: noStore });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ code: "invalid_request" }, { status: 400, headers: noStore }); }
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  const allowed = new Set(["capture_started","photo_added","location_added","question_shown","protocol_issued","capture_abandoned","capture_completed","capture_error","follow_up_started"]);
  if (!allowed.has(eventType)) return NextResponse.json({ code: "invalid_request" }, { status: 400, headers: noStore });
  const db = createComunRelataPersistenceClient();
  const { error } = await db.rpc("comun_relata_record_capture_event", {
    p_event_type: eventType,
    p_interaction_count: Number.isInteger(body.interactionCount) ? Math.max(0, Math.min(20, Number(body.interactionCount))) : 0,
    p_duration_bucket: typeof body.durationBucket === "string" ? body.durationBucket : null,
    p_category: typeof body.category === "string" ? body.category : null,
    p_error_code: typeof body.errorCode === "string" ? body.errorCode.slice(0, 80) : null,
  });
  if (error) return NextResponse.json({ code: "telemetry_unavailable" }, { status: 503, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
