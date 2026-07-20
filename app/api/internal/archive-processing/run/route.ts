import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runArchiveProcessingBatch } from "@/lib/archive/photo-processing-worker";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { evaluateArchiveOperationalAlerts } from "@/lib/archive/worker-health";
import { randomUUID } from "node:crypto";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405 });
}
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? "",
    actual =
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (
    !expected ||
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const started = Date.now(),
    db = createServiceSupabaseClient();
  let heartbeatId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (
      !["scheduler", "manual"].includes(body.source ?? "scheduler") ||
      !Number.isInteger(body.maxJobs ?? 3) ||
      body.maxJobs < 1 ||
      body.maxJobs > (body.source === "manual" ? 20 : 3)
    )
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    heartbeatId = randomUUID();
    await db
      ?.from("comun_archive_worker_heartbeats")
      .insert({
        id: heartbeatId,
        worker_type: "archive_processing",
        source: body.source ?? "scheduler",
        status: "running",
        started_at: new Date().toISOString(),
      });
    const result = await runArchiveProcessingBatch({
      maxJobs: body.maxJobs ?? 3,
    });
    await db
      ?.from("comun_archive_worker_heartbeats")
      .update({
        status: result.failed ? "partial" : "passed",
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - started,
        claimed_count: result.claimed,
        completed_count: result.completed,
        retry_count: result.failed,
      })
      .eq("id", heartbeatId);
    const health = await evaluateArchiveOperationalAlerts();
    return NextResponse.json({
      ok: true,
      claimed: result.claimed,
      completed: result.completed,
      retried: result.failed,
      deadLettered: 0,
      durationMs: Date.now() - started,
      queueRemaining: health.queueCount,
    });
  } catch {
    if (heartbeatId)
      await db
        ?.from("comun_archive_worker_heartbeats")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - started,
          sanitized_error: "worker_failed",
        })
        .eq("id", heartbeatId);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
