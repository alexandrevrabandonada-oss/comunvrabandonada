import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const manifestPath =
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const hardeningPath =
  "supabase/migrations/20260922120000_comun_canonical_security_hardening_v2.sql";
const hardeningHash =
  "59351a1736ca21683f6307e78b12fa9362697d8772c0a8c807ab7c387f1da279";
const sidewalkPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const sidewalkHash =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const readonlyEnv = () => ({
  ...process.env,
  PGOPTIONS: "-c default_transaction_read_only=on",
});

export function validateHardeningLedger(manifest, rows) {
  if (
    manifest.release !== "20260922120000-canonical-security-hardening-v2" ||
    manifest.migration !== hardeningPath ||
    manifest.migrationSha256 !== hardeningHash ||
    manifest.expectedPreFingerprint !==
      "db609afb6c7e6627a25b016460a2e1b02e7fb9f052fa1e440adeaed662b72460" ||
    manifest.expectedPostFingerprint !==
      "a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98" ||
    rows.length !== 1
  )
    throw new Error("HARDENING_LEDGER_NOT_ACCEPTED");
  const row = rows[0];
  if (
    row.release !== manifest.release ||
    row.migration_path !== manifest.migration ||
    row.migration_sha256 !== manifest.migrationSha256 ||
    row.pre_fingerprint !== manifest.expectedPreFingerprint ||
    row.post_fingerprint !== manifest.expectedPostFingerprint ||
    row.status !== "applied"
  )
    throw new Error("HARDENING_LEDGER_NOT_ACCEPTED");
}

export function withHeldFiles(files, operation) {
  const dir = mkdtempSync(join(tmpdir(), "comun-readonly-plan-"));
  const held = [];
  try {
    for (const file of files) {
      const destination = join(dir, String(held.length));
      renameSync(file, destination);
      held.push([file, destination]);
    }
    return operation();
  } finally {
    for (const [file, destination] of held.reverse())
      renameSync(destination, file);
    rmSync(dir, { recursive: true });
  }
}

export function assertEmptyPlan(plan) {
  const pending = [...new Set(plan.match(/20\d{12}_[a-z0-9_]+\.sql/g) || [])];
  if (
    pending.length ||
    /--include-all|migration repair|db reset|seed/.test(plan)
  )
    // Report only allowlisted filenames, never raw CLI output or connection data.
    throw new Error(
      `REMOTE_MIGRATION_PLAN_NOT_EMPTY:${pending.join(",") || "forbidden-operation"}`,
    );
  if (!/Remote database is up to date\./.test(plan))
    throw new Error("REMOTE_MIGRATION_PLAN_SUCCESS_MARKER_MISSING");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const output = process.argv[2];
  if (!output || !process.env.SUPABASE_DB_URL)
    throw new Error("READONLY_PLAN_INPUT_REQUIRED");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (
    hash(readFileSync(hardeningPath)) !== hardeningHash ||
    hash(readFileSync(sidewalkPath)) !== sidewalkHash
  )
    throw new Error("EXTERNAL_MIGRATION_BYTES_INVALID");
  // Only release metadata is read. Never repair Supabase history or apply SQL.
  const sql = `begin read only;
select coalesce(json_agg(row_to_json(r)), '[]'::json) from
(select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
 from public.comun_schema_releases
 where release='20260922120000-canonical-security-hardening-v2') r;
rollback;`;
  let rows;
  try {
    rows = JSON.parse(
      execFileSync(
        "psql",
        [process.env.SUPABASE_DB_URL, "-qXAt", "-v", "ON_ERROR_STOP=1"],
        {
          input: sql,
          encoding: "utf8",
          stdio: ["pipe", "pipe", "pipe"],
          env: readonlyEnv(),
        },
      ),
    );
  } catch {
    throw new Error("HARDENING_READONLY_LEDGER_CAPTURE_FAILED");
  }
  validateHardeningLedger(manifest, rows);
  withHeldFiles([sidewalkPath, hardeningPath], () => {
    const result = spawnSync(
      "supabase",
      ["db", "push", "--db-url", process.env.SUPABASE_DB_URL, "--dry-run"],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], env: readonlyEnv() },
    );
    if (result.error || result.signal || result.status !== 0)
      throw new Error("REMOTE_MIGRATION_DRY_RUN_FAILED");
    // Supabase CLI emits dry-run status messages on stderr as well as stdout.
    const plan = `${result.stdout}\n${result.stderr}`;
    assertEmptyPlan(plan);
    writeFileSync(output, plan);
  });
  if (
    hash(readFileSync(hardeningPath)) !== hardeningHash ||
    hash(readFileSync(sidewalkPath)) !== sidewalkHash
  )
    throw new Error("EXTERNAL_MIGRATION_RESTORE_INVALID");
  console.log("COMUN_READONLY_RECONCILED_MIGRATION_PLAN_EMPTY");
}
