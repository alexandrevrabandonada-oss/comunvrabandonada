import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getMediaStorage } from "@/lib/media-storage";
import {
  buildPhotoDerivativeIdempotencyKey,
  isStaleProcessingLock,
} from "./photo-processing-rules";
import { logComunAdminAction } from "@/lib/admin-audit";
export async function enqueueHistoricalPhotoDerivativeJob(assetId: string) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponivel");
  const { data: a, error } = await db
    .from("comun_archive_assets")
    .select(
      "id,archive_item_id,bucket_scope,mime_type,checksum_sha256,object_key,storage_provider",
    )
    .eq("id", assetId)
    .single();
  if (
    error ||
    !a ||
    a.bucket_scope !== "private_original" ||
    !a.archive_item_id
  )
    throw new Error("Asset original sem vinculo valido");
  if (!["image/jpeg", "image/png", "image/webp"].includes(a.mime_type))
    throw new Error("MIME invalido");
  if (!a.checksum_sha256) throw new Error("Checksum ausente");
  if (a.storage_provider === "supabase") {
    const { data } = await db.storage.from("archive-private-originals").createSignedUrl(a.object_key, 60);
    if (!data?.signedUrl) throw new Error("Original ausente");
  } else if (!(await getMediaStorage().objectExists("private_original", a.object_key))) throw new Error("Original ausente");
  const key = buildPhotoDerivativeIdempotencyKey({
    id: a.id,
    checksum_sha256: a.checksum_sha256,
  });
  const existing = await db
    .from("comun_archive_processing_jobs")
    .select("*")
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing.data) {
    await recordEvent(
      existing.data.id,
      "archive_processing_idempotency_hit",
      {},
    );
    return existing.data;
  }
  const created = await db
    .from("comun_archive_processing_jobs")
    .insert({
      job_type: "historical_photo_derivatives",
      archive_item_id: a.archive_item_id,
      archive_asset_id: a.id,
      idempotency_key: key,
      status: "queued",
    })
    .select("*")
    .single();
  if (created.error) throw created.error;
  await recordEvent(created.data.id, "archive_processing_job_created", {});
  await logComunAdminAction({
    action: "archive_processing_job_created",
    targetType: "archive_processing_job",
    targetId: created.data.id,
    metadata: { asset_id: a.id },
  });
  return created.data;
}
export async function claimNextArchiveProcessingJob(workerId: string) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponivel");
  const { data, error } = await db.rpc("claim_next_archive_processing_job", {
    p_worker_id: workerId,
  });
  if (error) throw error;
  const job = data?.[0] ?? null;
  if (job)
    await recordEvent(job.id, "archive_processing_job_claimed", {
      attempt: job.attempt_count,
    });
  return job;
}
export async function recoverStaleArchiveProcessingJobs() {
  const db = createServiceSupabaseClient();
  if (!db) return 0;
  const { data } = await db
    .from("comun_archive_processing_jobs")
    .select("id,locked_at")
    .eq("status", "processing");
  let count = 0;
  for (const j of data ?? [])
    if (isStaleProcessingLock(j.locked_at)) {
      await db
        .from("comun_archive_processing_jobs")
        .update({
          status: "retry_scheduled",
          locked_at: null,
          locked_by: null,
          available_at: new Date(Date.now() + 60000).toISOString(),
        })
        .eq("id", j.id);
      await recordEvent(j.id, "archive_processing_stale_recovered", {});
      count++;
    }
  return count;
}
export async function recordEvent(
  jobId: string,
  event_type: string,
  sanitized_metadata: Record<string, unknown>,
) {
  const db = createServiceSupabaseClient();
  await db
    ?.from("comun_archive_processing_events")
    .insert({ job_id: jobId, event_type, sanitized_metadata });
}

export async function enqueueDueMusicLinkChecks() {
  const db=createServiceSupabaseClient();if(!db)return 0;
  const cutoff=new Date(Date.now()-30*86400000).toISOString();
  const{data:links}=await db.from("comun_archive_external_links").select("id,archive_item_id,checked_at,official_status").in("official_status",["official","authorized"]).or(`checked_at.is.null,checked_at.lt.${cutoff}`).limit(20);
  let created=0;for(const link of links??[]){const period=new Date().toISOString().slice(0,10),key=`music-link:${link.id}:${period}`;const{error}=await db.from("comun_archive_processing_jobs").insert({job_type:"music_external_link_check",archive_item_id:link.archive_item_id,external_link_id:link.id,idempotency_key:key,status:"queued",priority:150,max_attempts:4});if(!error)created++}return created;
}
