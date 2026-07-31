import { NextRequest, NextResponse } from "next/server";
import { getArchiveWorkerHealth } from "@/lib/archive/worker-health";
import { matchesCronSecret } from "@/lib/security/cron-auth";
export async function GET(r: NextRequest) {
  const actual =
    r.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!matchesCronSecret(actual))
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
