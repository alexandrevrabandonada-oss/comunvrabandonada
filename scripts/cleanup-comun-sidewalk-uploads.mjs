import { createClient } from "@supabase/supabase-js";
import {
  assertCleanupTarget,
  isCleanupDeleteEligible,
  isCleanupMarkEligible,
} from "../lib/sidewalk-upload-cleanup.ts";

const argv = new Set(process.argv.slice(2));
const selectedModes = [
  argv.has("--execute") || argv.has("--execute-mark") ? "mark" : null,
  argv.has("--execute-delete") ? "delete" : null,
].filter(Boolean);
if (selectedModes.length > 1) throw new Error("CLEANUP_MODE_CONFLICT");
const mode = selectedModes[0] ?? "dry-run";
const limitArg = process.argv.find((value) => value.startsWith("--limit="));
const projectRefArg = process.argv.find((value) =>
  value.startsWith("--project-ref="),
);
const limit = Math.min(Math.max(Number(limitArg?.split("=")[1] ?? 25), 1), 100);
const markAgeHours = Math.max(
  Number(process.env.COMUN_SIDEWALK_CLEANUP_MARK_AGE_HOURS ?? 24),
  24,
);
const deleteAgeHours = Math.max(
  Number(process.env.COMUN_SIDEWALK_CLEANUP_DELETE_AGE_HOURS ?? 168),
  72,
);
const markAgeMs = markAgeHours * 3_600_000;
const deleteAgeMs = deleteAgeHours * 3_600_000;
const release = "20260724233256-comun-sidewalk-operational-hardening";
const migrationPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const migrationSha256 =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";

if (process.env.COMUN_SIDEWALK_OPERATIONAL_V2 !== "enabled") {
  console.log(
    JSON.stringify({
      status: "COMUN_SIDEWALK_OPERATIONAL_DISABLED",
      mode,
      examined: 0,
      marked: 0,
      deleted: 0,
    }),
  );
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("CLEANUP_CONFIGURATION_MISSING");

const target = assertCleanupTarget({
  url,
  projectRef: projectRefArg?.split("=")[1],
  allowNonLocal: argv.has("--allow-non-local"),
  allowlist: (process.env.COMUN_SIDEWALK_CLEANUP_ALLOWED_REFS ?? "")
    .split(",")
    .filter(Boolean),
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
  console.log(
    JSON.stringify({
      status: "COMUN_SIDEWALK_OPERATIONAL_DISABLED",
      mode,
      examined: 0,
      marked: 0,
      deleted: 0,
    }),
  );
  process.exit(0);
}

async function retryRead(factory) {
  let result;
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    result = await factory();
    if (!result.error || result.error.code !== "PGRST205" || attempt === 12)
      break;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  if (result.error) throw result.error;
  return result.data ?? [];
}

const now = new Date();
const markRows = await retryRead(() =>
  db
    .from("comun_sidewalk_uploads")
    .select(
      "id,object_key,status,confirmation_state,failure_code,expires_at,record_id",
    )
    .lt("expires_at", new Date(now.getTime() - markAgeMs).toISOString())
    .in("status", ["awaiting_upload", "uploaded"])
    .is("record_id", null)
    .order("expires_at")
    .limit(limit),
);
const deleteRows = await retryRead(() =>
  db
    .from("comun_sidewalk_uploads")
    .select(
      "id,object_key,status,confirmation_state,failure_code,expires_at,record_id",
    )
    .lt("expires_at", new Date(now.getTime() - deleteAgeMs).toISOString())
    .eq("status", "abandoned")
    .eq("confirmation_state", "abandoned")
    .eq("failure_code", "expired_cleanup_marked")
    .is("record_id", null)
    .order("expires_at")
    .limit(limit),
);

const markCandidates = markRows.filter((ticket) =>
  isCleanupMarkEligible(ticket, now, markAgeMs),
);
const deleteCandidates = deleteRows.filter((ticket) =>
  isCleanupDeleteEligible(ticket, now, deleteAgeMs),
);

let marked = 0;
let deleted = 0;
let missing = 0;
let skippedRace = 0;

if (mode === "mark") {
  for (const ticket of markCandidates) {
    const current = await db
      .from("comun_sidewalk_uploads")
      .select("status,confirmation_state,failure_code,expires_at,record_id")
      .eq("id", ticket.id)
      .maybeSingle();
    if (current.error) throw current.error;
    if (
      !current.data ||
      !isCleanupMarkEligible(current.data, new Date(), markAgeMs)
    ) {
      skippedRace += 1;
      continue;
    }
    const updated = await db
      .from("comun_sidewalk_uploads")
      .update({
        status: "abandoned",
        confirmation_state: "abandoned",
        failure_code: "expired_cleanup_marked",
        failure_kind: "final",
        confirmation_locked_at: null,
      })
      .eq("id", ticket.id)
      .is("record_id", null)
      .in("status", ["awaiting_upload", "uploaded"])
      .in("confirmation_state", [
        "idle",
        "ready",
        "confirming",
        "failed_retryable",
      ])
      .select("id")
      .maybeSingle();
    if (updated.error) throw updated.error;
    if (!updated.data) {
      skippedRace += 1;
      continue;
    }
    marked += 1;
  }
}

if (mode === "delete") {
  for (const ticket of deleteCandidates) {
    const current = await db
      .from("comun_sidewalk_uploads")
      .select("status,confirmation_state,failure_code,expires_at,record_id")
      .eq("id", ticket.id)
      .maybeSingle();
    if (current.error) throw current.error;
    if (
      !current.data ||
      !isCleanupDeleteEligible(current.data, new Date(), deleteAgeMs)
    ) {
      skippedRace += 1;
      continue;
    }

    const claim = await db
      .from("comun_sidewalk_uploads")
      .update({ failure_code: "expired_cleanup_deleting" })
      .eq("id", ticket.id)
      .eq("status", "abandoned")
      .eq("confirmation_state", "abandoned")
      .eq("failure_code", "expired_cleanup_marked")
      .is("record_id", null)
      .select("id")
      .maybeSingle();
    if (claim.error) throw claim.error;
    if (!claim.data) {
      skippedRace += 1;
      continue;
    }

    const removal = await db.storage
      .from("archive-private-originals")
      .remove([ticket.object_key]);
    if (
      removal.error &&
      !/not found|does not exist/i.test(removal.error.message)
    ) {
      await db
        .from("comun_sidewalk_uploads")
        .update({ failure_code: "expired_cleanup_marked" })
        .eq("id", ticket.id)
        .eq("failure_code", "expired_cleanup_deleting");
      throw removal.error;
    }
    if (removal.error) missing += 1;

    const finalized = await db
      .from("comun_sidewalk_uploads")
      .update({
        failure_code: removal.error
          ? "expired_cleanup_object_missing"
          : "expired_cleanup_deleted",
        failure_kind: "final",
        confirmation_locked_at: null,
      })
      .eq("id", ticket.id)
      .eq("failure_code", "expired_cleanup_deleting")
      .is("record_id", null)
      .select("id")
      .maybeSingle();
    if (finalized.error) throw finalized.error;
    if (!finalized.data) throw new Error("CLEANUP_DELETE_FINALIZATION_LOST");
    deleted += 1;
  }
}

const statuses = {
  "dry-run": "COMUN_SIDEWALK_UPLOAD_CLEAN_DRY_RUN",
  mark: "COMUN_SIDEWALK_UPLOAD_QUARANTINED",
  delete: "COMUN_SIDEWALK_UPLOAD_DELETED_AFTER_QUARANTINE",
};
console.log(
  JSON.stringify({
    status: statuses[mode],
    mode,
    target: target.local ? "local" : "allowlisted",
    markExamined: markRows.length,
    markEligible: markCandidates.length,
    deleteExamined: deleteRows.length,
    deleteEligible: deleteCandidates.length,
    marked,
    deleted,
    missing,
    skippedRace,
    limit,
    markAgeHours,
    deleteAgeHours,
  }),
);
