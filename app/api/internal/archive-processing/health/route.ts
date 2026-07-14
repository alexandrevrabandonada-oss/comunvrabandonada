import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getArchiveWorkerHealth } from "@/lib/archive/worker-health";
export async function GET(r: NextRequest) {
  const e = process.env.CRON_SECRET ?? "",
    a = r.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (
    !e ||
    a.length !== e.length ||
    !timingSafeEqual(Buffer.from(a), Buffer.from(e))
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const h = await getArchiveWorkerHealth();
  return NextResponse.json({
    state: h.state,
    lastHeartbeatAgeMinutes: h.lastHeartbeatAgeMinutes,
    queueCount: h.queueCount,
    retryCount: h.retryCount,
    deadLetterCount: h.deadLetterCount,
    staleCount: h.staleCount,
    openAlerts: h.openAlerts,
    timestamp: new Date().toISOString(),
  });
}
