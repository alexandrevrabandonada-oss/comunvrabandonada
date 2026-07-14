import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Supabase server-side ausente");
const db = createClient(url, key, { auth: { persistSession: false } }),
  { data: jobs } = await db
    .from("comun_archive_processing_jobs")
    .select("id,status,archive_item_id,archive_asset_id,created_at"),
  { data: assets } = await db
    .from("comun_archive_assets")
    .select(
      "id,archive_item_id,asset_role,bucket_scope,object_key,review_status",
    )
    .eq("bucket_scope", "public_safe");
const byItem = new Map();
for (const a of assets ?? []) {
  const list = byItem.get(a.archive_item_id) ?? [];
  list.push(a);
  byItem.set(a.archive_item_id, list);
}
const findings = [];
for (const j of jobs ?? []) {
  const list = byItem.get(j.archive_item_id) ?? [],
    thumb = list.some((a) => a.asset_role === "thumbnail"),
    display = list.some((a) => a.asset_role === "public_version");
  if (j.status === "completed" && (!thumb || !display))
    findings.push({ job_id: j.id, type: "completed_missing_pair" });
  if (["failed", "dead_letter"].includes(j.status) && thumb !== display)
    findings.push({ job_id: j.id, type: "failed_partial_pair" });
}
const report = {
  generated_at: new Date().toISOString(),
  dry_run: process.env.ARCHIVE_DERIVATIVE_CLEANUP_CONFIRM !== "true",
  findings,
};
console.log(JSON.stringify(report, null, 2));
if (process.env.ARCHIVE_DERIVATIVE_CLEANUP_CONFIRM === "true")
  console.log(
    "[safe] exclusao automatica nao aplicada: revisao administrativa obrigatoria",
  );
