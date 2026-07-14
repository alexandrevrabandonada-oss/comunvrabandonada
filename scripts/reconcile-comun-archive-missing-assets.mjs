import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
  missing = required.filter((k) => !process.env[k]);
if (missing.length)
  throw new Error(`Configuracao incompleta: ${missing.join(", ")}`);
const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  ),
  confirm = process.env.ARCHIVE_MISSING_ASSET_DELETE_CONFIRM === "true";
const source = JSON.parse(
    await fs.readFile(
      path.join(process.cwd(), "reports", "r2-orphans-2026-07-14.json"),
      "utf8",
    ),
  ),
  ids = source.missingObjects.map((x) => x.id);
const { data, error } = await db
  .from("comun_archive_assets")
  .select(
    "id, archive_item_id, object_key, original_filename, public_url, created_at, comun_archive_items(id, slug, status, visibility, published_at)",
  )
  .in("id", ids);
if (error) throw error;
const keyHash = (key) => createHash("sha256").update(key).digest("hex"),
  entries = [];
for (const asset of data ?? []) {
  const item = asset.comun_archive_items,
    smoke = Boolean(
      item?.slug?.includes("smoke") ||
      asset.public_url?.includes("example.invalid"),
    );
  const published =
    item?.status === "published" && item?.visibility === "public";
  let decision = smoke
    ? "delete_smoke_asset"
    : published
      ? "unpublish_and_review"
      : "mark_review_required";
  let applied = "none";
  if (confirm) {
    if (smoke) {
      await db.from("comun_archive_assets").delete().eq("id", asset.id);
      applied = "asset_deleted";
    } else {
      await db
        .from("comun_archive_assets")
        .update({
          integrity_status: "review_required",
          review_status: "rejected",
        })
        .eq("id", asset.id);
      applied = "asset_marked_review_required";
      if (published && item) {
        await db
          .from("comun_archive_items")
          .update({
            status: "unpublished",
            visibility: "private",
            published_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
        applied += "_item_unpublished";
      }
    }
    await db.from("comun_admin_audit_log").insert({
      action: "archive_missing_asset_reconciled",
      target_type: "archive_asset",
      target_id: asset.id,
      metadata: {
        decision,
        applied,
        item_status: item?.status ?? null,
        item_id: item?.id ?? null,
        key_hash: keyHash(asset.object_key),
      },
    });
  }
  entries.push({
    asset_id: asset.id,
    item_id: item?.id ?? null,
    item_status: item?.status ?? "missing",
    item_visibility: item?.visibility ?? null,
    key_hash: keyHash(asset.object_key),
    smoke,
    published,
    decision,
    applied,
  });
}
const report = {
  generated_at: new Date().toISOString(),
  mode: confirm ? "confirmed" : "dry-run",
  summary: {
    expected: ids.length,
    found: entries.length,
    smoke: entries.filter((x) => x.smoke).length,
    published_missing: entries.filter((x) => x.published).length,
    deleted: entries.filter((x) => x.applied === "asset_deleted").length,
    marked_for_review: entries.filter((x) =>
      x.applied.includes("review_required"),
    ).length,
  },
  entries,
};
const file = path.join(
  process.cwd(),
  "reports",
  `acervo-assets-ausentes-reconciliacao-${new Date().toISOString().slice(0, 10)}.json`,
);
await fs.writeFile(file, JSON.stringify(report, null, 2));
console.log(`Relatorio gerado: ${file}`);
console.log(JSON.stringify(report.summary));
