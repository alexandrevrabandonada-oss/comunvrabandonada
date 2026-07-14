import "server-only";
import { randomUUID, createHash } from "node:crypto";
import sharp from "sharp";
import {
  getMediaStorage,
  mediaStorageConfiguration,
  publicMediaUrl,
} from "@/lib/media-storage";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { logComunAdminAction } from "@/lib/admin-audit";
import {
  isVerificationRunStale,
  safeVerificationSummary,
  sanitizeVerificationError,
  VERIFICATION_PREFIX,
} from "./production-verification-rules";

type Step = { name: string; passed: boolean; durationMs: number };
export async function runArchiveProductionVerification(
  options: { initiatedBy?: string } = {},
) {
  const db = createServiceSupabaseClient();
  if (!db) throw new Error("Banco server-side indisponivel.");
  const database = db;
  const config = mediaStorageConfiguration();
  if (!config.configured) throw new Error("Storage server-side incompleto.");
  const now = Date.now(),
    runId = randomUUID(),
    steps: Step[] = [];
  const existing = await db
    .from("comun_system_verification_runs")
    .select("id,started_at")
    .eq("verification_type", "archive_production")
    .eq("status", "running")
    .maybeSingle();
  if (existing.data && !isVerificationRunStale(existing.data.started_at))
    throw new Error("Uma verificacao ja esta em execucao.");
  if (existing.data)
    await database
      .from("comun_system_verification_runs")
      .update({
        status: "cancelled",
        finished_at: new Date().toISOString(),
        sanitized_error: "stale_run",
      })
      .eq("id", existing.data.id);
  const recent = await db
    .from("comun_system_verification_runs")
    .select("started_at")
    .eq("verification_type", "archive_production")
    .gte("started_at", new Date(now - 3600000).toISOString())
    .limit(1);
  if (recent.data?.length)
    throw new Error("Limite de uma verificacao por hora atingido.");
  const inserted = await db
    .from("comun_system_verification_runs")
    .insert({
      id: runId,
      verification_type: "archive_production",
      status: "running",
      initiated_by: options.initiatedBy ?? null,
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error("Lock de verificacao indisponivel.");
  await logComunAdminAction({
    action: "archive_production_verification_started",
    targetType: "system_verification",
    targetId: runId,
  });
  const storage = getMediaStorage(),
    base = `${VERIFICATION_PREFIX}${runId}`,
    originalKey = `${base}/original/fixture.png`,
    thumbKey = `${base}/public/thumbnail.webp`,
    displayKey = `${base}/public/display.webp`;
  let itemId: string | undefined,
    submissionId: string | undefined,
    cleanup = false;
  const step = async (name: string, fn: () => Promise<void>) => {
    const t = Date.now();
    await fn();
    steps.push({ name, passed: true, durationMs: Date.now() - t });
  };
  try {
    const fixture = await sharp({
      create: { width: 640, height: 480, channels: 3, background: "#d8b45a" },
    })
      .png()
      .toBuffer();
    await step("private_storage", async () => {
      await storage.putObject({
        scope: "private_original",
        key: originalKey,
        contentType: "image/png",
        sizeBytes: fixture.length,
        body: fixture,
      });
      if (!(await storage.objectExists("private_original", originalKey)))
        throw new Error("HEAD privado falhou");
      const signed = await storage.createPrivateReadUrl(originalKey, 60);
      const res = await fetch(signed.url, { cache: "no-store" });
      if (!res.ok) throw new Error("Leitura privada falhou");
    });
    const checksum = createHash("sha256").update(fixture).digest("hex");
    const thumb = await sharp(fixture)
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    const display = await sharp(fixture)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();
    await step("processing", async () => {
      for (const body of [thumb, display]) {
        const m = await sharp(body).metadata();
        if (m.format !== "webp" || m.exif || m.icc || m.xmp)
          throw new Error("Derivado inseguro");
      }
    });
    await step("public_storage", async () => {
      await storage.putObject({
        scope: "public_safe",
        key: thumbKey,
        contentType: "image/webp",
        sizeBytes: thumb.length,
        body: thumb,
      });
      await storage.putObject({
        scope: "public_safe",
        key: displayKey,
        contentType: "image/webp",
        sizeBytes: display.length,
        body: display,
      });
      const res = await fetch(publicMediaUrl(displayKey), {
        cache: "no-store",
      });
      if (
        !res.ok ||
        res.headers.get("content-type")?.split(";")[0] !== "image/webp"
      )
        throw new Error("Derivado publico falhou");
    });
    await step("database", async () => {
      const item = await db
        .from("comun_archive_items")
        .insert({
          slug: `system-test-${runId}`,
          item_type: "photograph",
          title: "System test",
          source_name: "system_test=true",
          credits: "System test",
          rights_status: "permission_granted",
          status: "draft",
          visibility: "private",
          editorial_notes: "system_test=true",
        })
        .select("id")
        .single();
      if (item.error) throw item.error;
      itemId = item.data.id;
      const sub = await db
        .from("comun_archive_submissions")
        .insert({
          archive_item_id: itemId,
          status: "approved",
          title_suggestion: "system_test=true",
          permission_confirmed: true,
          rights_declaration: "system_test=true",
        })
        .select("id")
        .single();
      if (sub.error) throw sub.error;
      submissionId = sub.data.id;
      await db.from("comun_archive_assets").insert([
        {
          archive_item_id: itemId,
          asset_role: "original",
          bucket_scope: "private_original",
          object_key: originalKey,
          mime_type: "image/png",
          checksum_sha256: checksum,
          review_status: "approved",
          integrity_status: "verified",
          rights_status: "permission_granted",
          credits: "System test",
        },
        {
          archive_item_id: itemId,
          asset_role: "thumbnail",
          bucket_scope: "public_safe",
          object_key: thumbKey,
          public_url: publicMediaUrl(thumbKey),
          mime_type: "image/webp",
          review_status: "approved",
          integrity_status: "verified",
          rights_status: "permission_granted",
          credits: "System test",
          alt_text: "Fixture tecnica",
        },
        {
          archive_item_id: itemId,
          asset_role: "public_version",
          bucket_scope: "public_safe",
          object_key: displayKey,
          public_url: publicMediaUrl(displayKey),
          mime_type: "image/webp",
          review_status: "approved",
          integrity_status: "verified",
          rights_status: "permission_granted",
          credits: "System test",
          alt_text: "Fixture tecnica",
        },
      ]);
    });
    await step("publication", async () => {
      const draft = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/comun/acervo/system-test-${runId}`,
        { cache: "no-store" },
      );
      if (draft.status !== 404) throw new Error("Draft apareceu publicamente");
      await db
        .from("comun_archive_items")
        .update({
          status: "published",
          visibility: "public",
          published_at: new Date().toISOString(),
        })
        .eq("id", itemId!);
      const live = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/comun/acervo/system-test-${runId}`,
        { cache: "no-store" },
      );
      const html = await live.text();
      if (
        !live.ok ||
        html.includes(originalKey) ||
        html.includes("contributor_contact_private")
      )
        throw new Error("Publicacao insegura");
      await db
        .from("comun_archive_items")
        .update({
          status: "unpublished",
          visibility: "private",
          published_at: null,
        })
        .eq("id", itemId!);
      const gone = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/comun/acervo/system-test-${runId}`,
        { cache: "no-store" },
      );
      if (gone.status !== 404) throw new Error("Despublicacao falhou");
    });
    return await finish("passed");
  } catch (error) {
    steps.push({ name: "failure", passed: false, durationMs: 0 });
    await finish("failed", error);
    throw new Error(sanitizeVerificationError(error));
  } finally {
    try {
      await storage.deleteObject("public_safe", thumbKey).catch(() => {});
      await storage.deleteObject("public_safe", displayKey).catch(() => {});
      await storage
        .deleteObject("private_original", originalKey)
        .catch(() => {});
      if (submissionId)
        await db
          .from("comun_archive_submissions")
          .delete()
          .eq("id", submissionId);
      if (itemId)
        await db.from("comun_archive_items").delete().eq("id", itemId);
      cleanup =
        !(await storage.objectExists("private_original", originalKey)) &&
        !(await storage.objectExists("public_safe", thumbKey)) &&
        !(await storage.objectExists("public_safe", displayKey));
      await db
        .from("comun_system_verification_runs")
        .update({
          status: cleanup ? "passed" : "cleanup_required",
          finished_at: new Date().toISOString(),
          result_summary: safeVerificationSummary({
            steps,
            cleanup,
            durationMs: Date.now() - now,
          }),
        })
        .eq("id", runId);
      await logComunAdminAction({
        action: cleanup
          ? "archive_production_verification_cleanup_completed"
          : "archive_production_verification_cleanup_failed",
        targetType: "system_verification",
        targetId: runId,
      });
    } catch {
      await db
        .from("comun_system_verification_runs")
        .update({
          status: "cleanup_required",
          finished_at: new Date().toISOString(),
          sanitized_error: "cleanup_failed",
        })
        .eq("id", runId);
    }
  }
  async function finish(status: "passed" | "failed", error?: unknown) {
    const summary = safeVerificationSummary({
      steps,
      cleanup,
      durationMs: Date.now() - now,
    });
    await database
      .from("comun_system_verification_runs")
      .update({
        status,
        finished_at: new Date().toISOString(),
        result_summary: summary,
        sanitized_error: error ? sanitizeVerificationError(error) : null,
      })
      .eq("id", runId);
    await logComunAdminAction({
      action: `archive_production_verification_${status}`,
      targetType: "system_verification",
      targetId: runId,
      metadata: {
        steps: steps.map((s) => s.name),
        duration_ms: summary.durationMs,
      },
    });
    return { runId, status, summary };
  }
}
