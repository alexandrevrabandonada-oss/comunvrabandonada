import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getMediaStorage, publicMediaUrl } from "@/lib/media-storage";
import {
  deterministicDerivativeKey,
  PHOTO_RECIPE,
  processingBackoff,
  sanitizeArchiveProcessingError,
} from "./photo-processing-rules";
import {
  claimNextArchiveProcessingJob,
  recordEvent,
  recoverStaleArchiveProcessingJobs,
} from "./photo-processing-queue";
import { enqueueDueMusicLinkChecks } from "./photo-processing-queue";
import { checkMusicExternalUrl, persistMusicLinkCheck } from "./music-link-checker";
import { evaluateMusicEditorialSloAlerts } from "./music-editorial-slo";
import { evaluateOralHistoryAlerts } from "./oral-history-alerts";

async function processMusicExternalLinkCheckJob(job: any) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponivel");
  const start = Date.now();
  await db.from("comun_archive_processing_attempts").insert({job_id:job.id,attempt_number:job.attempt_count,status:"processing",worker_id:job.locked_by});
  const {data:link}=await db.from("comun_archive_external_links").select("id,url,platform").eq("id",job.external_link_id).single();
  if(!link) throw new Error("Link musical ausente");
  const hostname=new URL(link.url).hostname,check=await checkMusicExternalUrl(link.url,[hostname],link.platform);
  const state=await persistMusicLinkCheck(link.id,check,"scheduler");
  if(state.current==="broken") await db.from("comun_admin_alerts").upsert({alert_type:"archive_music_broken_link",severity:"attention",title:"Link musical quebrado",sanitized_message:"Link externo exige revisão.",source_type:"archive_processing",source_id:link.id,fingerprint:`archive_music_broken_link:${link.id}`},{onConflict:"fingerprint"});
  await db.from("comun_archive_processing_jobs").update({status:"completed",completed_at:new Date().toISOString(),locked_at:null,locked_by:null,result_summary:{status:check.status}}).eq("id",job.id);
  await db.from("comun_archive_processing_attempts").update({status:"completed",finished_at:new Date().toISOString(),duration_ms:Date.now()-start,metrics:{status:check.status}}).eq("job_id",job.id).eq("attempt_number",job.attempt_count);
  await recordEvent(job.id,"archive_music_link_check_completed",{status:check.status});
  return {completed:true};
}
export async function processHistoricalPhotoDerivativeJob(job: any) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco indisponivel");
  const start = Date.now(),
    metrics: any = {};
  await db.from("comun_archive_processing_attempts").insert({
    job_id: job.id,
    attempt_number: job.attempt_count,
    status: "processing",
    worker_id: job.locked_by,
    started_at: new Date().toISOString(),
  });
  try {
    const { data: a } = await db
      .from("comun_archive_assets")
      .select("*")
      .eq("id", job.archive_asset_id)
      .single();
    if (!a || a.bucket_scope !== "private_original" || !a.archive_item_id)
      throw new Error("Asset sem vinculo valido");
    const t0 = Date.now(),
      signed = await getMediaStorage().createPrivateReadUrl(a.object_key, 180),
      res = await fetch(signed.url, { cache: "no-store" });
    if (!res.ok) throw new Error("Original ausente");
    const bytes = new Uint8Array(await res.arrayBuffer());
    metrics.download_ms = Date.now() - t0;
    metrics.original_bytes = bytes.byteLength;
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== a.checksum_sha256)
      throw new Error("Checksum divergente persistente");
    const decoded = await sharp(bytes, { failOn: "error" }).metadata();
    if (!decoded.width || !decoded.height)
      throw new Error("Imagem nao decodificavel");
    const cancellation = await db
      .from("comun_archive_processing_jobs")
      .select("status")
      .eq("id", job.id)
      .single();
    if (cancellation.data?.status === "cancel_requested") {
      await db
        .from("comun_archive_processing_jobs")
        .update({ status: "cancelled", locked_at: null, locked_by: null })
        .eq("id", job.id);
      await db
        .from("comun_archive_processing_attempts")
        .update({
          status: "cancelled",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - start,
        })
        .eq("job_id", job.id)
        .eq("attempt_number", job.attempt_count);
      await recordEvent(job.id, "archive_processing_job_cancelled", {});
      return { completed: false, status: "cancelled" };
    }
    const sharpStart = Date.now();
    const outputs = [] as any[];
    for (const kind of ["thumbnail", "display"] as const) {
      const spec = PHOTO_RECIPE[kind],
        body = await sharp(bytes, { failOn: "error" })
          .rotate()
          .resize({ width: spec.width, withoutEnlargement: true })
          .webp({ quality: spec.quality })
          .toBuffer(),
        key = deterministicDerivativeKey(a.archive_item_id, checksum, kind),
        bodyChecksum = createHash("sha256").update(body).digest("hex"),
        existing = await db
          .from("comun_archive_assets")
          .select("id,checksum_sha256")
          .eq("bucket_scope", "public_safe")
          .eq("object_key", key)
          .maybeSingle();
      let hit = Boolean(
        existing.data &&
        existing.data.checksum_sha256 === bodyChecksum &&
        (await getMediaStorage().objectExists("public_safe", key)),
      );
      if (!hit)
        await getMediaStorage().putObject({
          scope: "public_safe",
          key,
          contentType: "image/webp",
          sizeBytes: body.length,
          body,
        });
      const meta = await sharp(body).metadata(),
        role = kind === "display" ? "public_version" : "thumbnail";
      if (existing.data)
        await db
          .from("comun_archive_assets")
          .update({
            checksum_sha256: bodyChecksum,
            size_bytes: body.length,
            width: meta.width,
            height: meta.height,
            review_status: "pending",
            integrity_status: "verified",
            mime_type: "image/webp",
          })
          .eq("id", existing.data.id);
      else
        await db.from("comun_archive_assets").insert({
          archive_item_id: a.archive_item_id,
          asset_role: role,
          bucket_scope: "public_safe",
          object_key: key,
          public_url: publicMediaUrl(key),
          mime_type: "image/webp",
          size_bytes: body.length,
          checksum_sha256: bodyChecksum,
          width: meta.width,
          height: meta.height,
          review_status: "pending",
          integrity_status: "verified",
          derivative_kind: kind,
          rights_status: a.rights_status,
          credits: a.credits,
        });
      outputs.push({ kind, bytes: body.length, hit });
    }
    metrics.sharp_upload_ms = Date.now() - sharpStart;
    metrics.thumbnail_bytes = outputs[0].bytes;
    metrics.display_bytes = outputs[1].bytes;
    metrics.idempotency_hit = outputs.every((x) => x.hit);
    metrics.duration_ms = Date.now() - start;
    await db
      .from("comun_archive_processing_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        locked_at: null,
        locked_by: null,
        result_summary: { recipe: "v1", metrics },
      })
      .eq("id", job.id);
    await db
      .from("comun_archive_processing_attempts")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        duration_ms: metrics.duration_ms,
        metrics,
      })
      .eq("job_id", job.id)
      .eq("attempt_number", job.attempt_count);
    await recordEvent(job.id, "archive_processing_job_completed", {
      duration_ms: metrics.duration_ms,
      idempotency_hit: metrics.idempotency_hit,
    });
    return { completed: true };
  } catch (error) {
    const safe = sanitizeArchiveProcessingError(error),
      dead = !safe.retryable || job.attempt_count >= job.max_attempts,
      status = dead ? "dead_letter" : "retry_scheduled",
      available = new Date(
        Date.now() + processingBackoff(job.attempt_count + 1) * 1000,
      ).toISOString();
    await db
      .from("comun_archive_processing_jobs")
      .update({
        status,
        failed_at: dead ? new Date().toISOString() : null,
        available_at: available,
        locked_at: null,
        locked_by: null,
        last_error_code: safe.code,
        last_error_summary: safe.summary,
      })
      .eq("id", job.id);
    await db
      .from("comun_archive_processing_attempts")
      .update({
        status,
        error_code: safe.code,
        error_summary: safe.summary,
        finished_at: new Date().toISOString(),
        duration_ms: Date.now() - start,
      })
      .eq("job_id", job.id)
      .eq("attempt_number", job.attempt_count);
    await recordEvent(
      job.id,
      dead
        ? "archive_processing_job_dead_lettered"
        : "archive_processing_job_retry_scheduled",
      { code: safe.code },
    );
    return { completed: false, status };
  }
}
export async function runArchiveProcessingBatch(
  options: { maxJobs?: number; maxMs?: number } = {},
) {
  const start = Date.now(),
    workerId = `vercel-${randomUUID()}`,
    maxJobs = options.maxJobs ?? 3,
    maxMs = options.maxMs ?? 40000;
  const staleRecovered = await recoverStaleArchiveProcessingJobs();
  await enqueueDueMusicLinkChecks();
  await evaluateMusicEditorialSloAlerts();
  await evaluateOralHistoryAlerts();
  let claimed = 0,
    completed = 0,
    failed = 0;
  while (claimed < maxJobs && Date.now() - start < maxMs) {
    const job = await claimNextArchiveProcessingJob(workerId);
    if (!job) break;
    claimed++;
    const result = job.job_type === "music_external_link_check" ? await processMusicExternalLinkCheckJob(job) : await processHistoricalPhotoDerivativeJob(job);
    result.completed ? completed++ : failed++;
  }
  return {
    claimed,
    completed,
    failed,
    staleRecovered,
    durationMs: Date.now() - start,
  };
}
