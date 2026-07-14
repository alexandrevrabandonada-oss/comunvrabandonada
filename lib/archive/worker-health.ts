import "server-only";
import { createHash } from "node:crypto";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
export function alertFingerprint(type: string, id = "global") {
  return createHash("sha256").update(`${type}:${id}`).digest("hex");
}
export function calculateWorkerState(x: {
  lastAge: number | null;
  dead: number;
  stale: number;
  queued: number;
  oldestAge: number;
  cleanup: number;
}) {
  if (
    x.cleanup > 0 ||
    x.stale > 0 ||
    x.dead > 3 ||
    x.lastAge === null ||
    x.lastAge > 60
  )
    return "critical";
  if (x.dead > 0 || x.queued > 20 || x.oldestAge > 60 || x.lastAge > 30)
    return "attention";
  return "healthy";
}
export async function getArchiveWorkerHealth() {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponivel");
  const now = Date.now();
  const [{ data: h }, { data: jobs }, { count: alerts }, { count: cleanup }] =
    await Promise.all([
      db
        .from("comun_archive_worker_heartbeats")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100),
      db
        .from("comun_archive_processing_jobs")
        .select("status,created_at,locked_at,completed_at"),
      db
        .from("comun_admin_alerts")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "acknowledged"]),
      db
        .from("comun_system_verification_runs")
        .select("id", { count: "exact", head: true })
        .eq("status", "cleanup_required"),
    ]);
  const last = h?.[0],
    lastPassed = h?.find((x) => x.status === "passed"),
    queued = (jobs ?? []).filter((x) => x.status === "queued"),
    retry = (jobs ?? []).filter((x) => x.status === "retry_scheduled").length,
    dead = (jobs ?? []).filter((x) => x.status === "dead_letter").length,
    stale = (jobs ?? []).filter(
      (x) =>
        x.status === "processing" &&
        x.locked_at &&
        now - new Date(x.locked_at).getTime() > 900000,
    ).length,
    lastAge = last
      ? Math.floor((now - new Date(last.started_at).getTime()) / 60000)
      : null,
    oldestAge = queued.length
      ? Math.floor(
          (now -
            Math.min(...queued.map((x) => new Date(x.created_at).getTime()))) /
            60000,
        )
      : 0;
  return {
    state: calculateWorkerState({
      lastAge,
      dead,
      stale,
      queued: queued.length,
      oldestAge,
      cleanup: cleanup ?? 0,
    }),
    lastHeartbeat: last ?? null,
    lastPassed: lastPassed ?? null,
    lastHeartbeatAgeMinutes: lastAge,
    queueCount: queued.length,
    retryCount: retry,
    deadLetterCount: dead,
    staleCount: stale,
    oldestQueueAgeMinutes: oldestAge,
    openAlerts: alerts ?? 0,
  };
}
async function upsertAlert(
  type: string,
  severity: string,
  title: string,
  message: string,
  id = "global",
) {
  const db = createServiceSupabaseClient()!,
    fingerprint = alertFingerprint(type, id),
    existing = await db
      .from("comun_admin_alerts")
      .select("id,occurrence_count,status")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
  if (existing.data)
    await db
      .from("comun_admin_alerts")
      .update({
        severity,
        title,
        sanitized_message: message,
        last_seen_at: new Date().toISOString(),
        occurrence_count: existing.data.occurrence_count + 1,
        status: "open",
        resolved_at: null,
      })
      .eq("id", existing.data.id);
  else
    await db
      .from("comun_admin_alerts")
      .insert({
        alert_type: type,
        severity,
        title,
        sanitized_message: message,
        fingerprint,
        source_type: "archive_processing",
      });
}
export async function evaluateArchiveOperationalAlerts() {
  const health = await getArchiveWorkerHealth(),
    db = createServiceSupabaseClient()!;
  if (
    health.lastHeartbeatAgeMinutes === null ||
    health.lastHeartbeatAgeMinutes > 60
  )
    await upsertAlert(
      "archive_worker_missing_heartbeat",
      "critical",
      "Worker sem heartbeat",
      "Nenhuma execução bem-sucedida recente.",
    );
  if (health.queueCount > 20 || health.oldestQueueAgeMinutes > 60)
    await upsertAlert(
      "archive_queue_accumulating",
      "urgent",
      "Fila acumulada",
      `${health.queueCount} jobs aguardando.`,
    );
  if (health.staleCount)
    await upsertAlert(
      "archive_job_stale",
      "urgent",
      "Jobs presos",
      `${health.staleCount} locks stale.`,
    );
  if (health.deadLetterCount)
    await upsertAlert(
      "archive_job_dead_letter",
      health.deadLetterCount > 3 ? "critical" : "attention",
      "Dead-letter do Acervo",
      `${health.deadLetterCount} jobs exigem revisão.`,
    );
  const { data: cleanup } = await db
    .from("comun_system_verification_runs")
    .select("id")
    .eq("status", "cleanup_required");
  if (cleanup?.length)
    await upsertAlert(
      "archive_cleanup_required",
      "critical",
      "Cleanup pendente",
      `${cleanup.length} verificações exigem limpeza.`,
    );
  return getArchiveWorkerHealth();
}
