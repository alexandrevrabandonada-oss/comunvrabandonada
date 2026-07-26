import { createClient } from "@supabase/supabase-js";
import { assertCleanupTarget, isCleanupEligible } from "../lib/sidewalk-upload-cleanup.ts";

const argv = new Set(process.argv.slice(2));
const execute = argv.has("--execute");
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const projectRefArg = process.argv.find((value) => value.startsWith("--project-ref="));
const limit = Math.min(Math.max(Number(limitArg?.split("=")[1] ?? 25), 1), 100);
const minimumAgeMs = Math.max(Number(process.env.COMUN_SIDEWALK_CLEANUP_MIN_AGE_HOURS ?? 24), 24) * 3_600_000;
const release = "20260724233256-comun-sidewalk-operational-hardening";
const migrationPath = "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const migrationSha256 = "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
if (process.env.COMUN_SIDEWALK_OPERATIONAL_V2 !== "enabled") {
  console.log(JSON.stringify({ status: "COMUN_SIDEWALK_OPERATIONAL_DISABLED", examined: 0, removed: 0 }));
  process.exit(0);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("CLEANUP_CONFIGURATION_MISSING");

const target = assertCleanupTarget({
  url,
  projectRef: projectRefArg?.split("=")[1],
  allowNonLocal: argv.has("--allow-non-local"),
  allowlist: (process.env.COMUN_SIDEWALK_CLEANUP_ALLOWED_REFS ?? "").split(",").filter(Boolean),
});
const db = createClient(url, key, { auth: { persistSession: false } });
const ledger = await db
  .from("comun_schema_releases")
  .select("release,status,migration_path,migration_sha256")
  .eq("release", release)
  .maybeSingle();
if (
  ledger.error ||
  !ledger.data ||
  ledger.data.status !== "applied" ||
  ledger.data.migration_path !== migrationPath ||
  ledger.data.migration_sha256 !== migrationSha256
) {
  console.log(JSON.stringify({ status: "COMUN_SIDEWALK_OPERATIONAL_DISABLED", examined: 0, removed: 0 }));
  process.exit(0);
}
const now = new Date();
let query;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  query = await db.from("comun_sidewalk_uploads").select("id,object_key,status,confirmation_state,expires_at,record_id").lt("expires_at", new Date(now.getTime() - minimumAgeMs).toISOString()).in("status", ["awaiting_upload", "uploaded"]).is("record_id", null).order("expires_at").limit(limit);
  if (!query.error || query.error.code !== "PGRST205" || attempt === 12) break;
  await new Promise((resolve) => setTimeout(resolve, 5_000));
}
if (query.error) throw query.error;
const candidates = (query.data ?? []).filter((ticket) => isCleanupEligible(ticket, now, minimumAgeMs));
let removed = 0, missing = 0, skippedRace = 0;

if (execute) for (const ticket of candidates) {
  const current = await db.from("comun_sidewalk_uploads").select("status,confirmation_state,expires_at,record_id").eq("id", ticket.id).maybeSingle();
  if (current.error) throw current.error;
  if (!current.data || !isCleanupEligible(current.data, new Date(), minimumAgeMs)) { skippedRace += 1; continue; }
  const removal = await db.storage.from("archive-private-originals").remove([ticket.object_key]);
  if (removal.error && !/not found|does not exist/i.test(removal.error.message)) throw removal.error;
  if (removal.error) missing += 1;
  const updated = await db.from("comun_sidewalk_uploads").update({ status: "abandoned", confirmation_state: "abandoned", failure_code: removal.error ? "expired_cleanup_object_missing" : "expired_cleanup", failure_kind: "final", confirmation_locked_at: null }).eq("id", ticket.id).is("record_id", null).in("status", ["awaiting_upload", "uploaded"]).in("confirmation_state", ["idle", "ready", "confirming", "failed_retryable"]);
  if (updated.error) throw updated.error;
  removed += 1;
}

console.log(JSON.stringify({ status: execute ? "COMUN_SIDEWALK_UPLOAD_CLEAN" : "COMUN_SIDEWALK_UPLOAD_CLEAN_DRY_RUN", mode: execute ? "execute" : "dry-run", target: target.local ? "local" : "allowlisted", examined: query.data?.length ?? 0, eligible: candidates.length, removed, missing, skippedRace, limit, minimumAgeHours: minimumAgeMs / 3_600_000 }));
