import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateDomainMigrationStatus } from "./readonly-domain-migration-status.mjs";

// Metadata only. Never run a push, repair, migration, or business query.
export function captureDomainStatus({
  lane,
  env = process.env,
  run = execFileSync,
}) {
  if (
    !env.SUPABASE_DB_URL ||
    env.PGSSLMODE !== "verify-full" ||
    !env.PGSSLROOTCERT ||
    env.PGOPTIONS !== "-c default_transaction_read_only=on"
  )
    throw new Error("DOMAIN_STATUS_READONLY_TLS_REQUIRED");
  // libpq URI parameters override PG* defaults. Refuse a transport downgrade
  // rather than certifying TLS from environment variables alone.
  let connection;
  try {
    connection = new URL(env.SUPABASE_DB_URL);
  } catch {
    throw new Error("DOMAIN_STATUS_CONNECTION_URI_REQUIRED");
  }
  if (!["postgres:", "postgresql:"].includes(connection.protocol))
    throw new Error("DOMAIN_STATUS_CONNECTION_URI_REQUIRED");
  for (const [key, value] of connection.searchParams) {
    if (
      (key === "sslmode" && value === "verify-full") ||
      (key === "sslrootcert" && value === env.PGSSLROOTCERT)
    )
      continue;
    if (/^(ssl|gss|service|host|port|options)/i.test(key))
      throw new Error("DOMAIN_STATUS_CONNECTION_OVERRIDE_REFUSED");
  }
  const changedMigrations = run(
    "git",
    ["diff", "--name-only", "origin/main...HEAD", "--", "supabase/migrations"],
    { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  )
    .trim()
    .split("\n")
    .filter(Boolean);
  if (changedMigrations.length)
    throw new Error("DOMAIN_STATUS_CHANGED_MIGRATIONS");
  const sql = `begin read only;
select json_build_object(
 'transactionReadOnly',current_setting('transaction_read_only')='on',
 'remoteVersions',(select coalesce(json_agg(version order by version),'[]'::json) from supabase_migrations.schema_migrations),
 'hardeningRows',(select coalesce(json_agg(row_to_json(r)),'[]'::json) from
  (select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status from public.comun_schema_releases
   where release='20260922120000-canonical-security-hardening-v2') r));
rollback;`;
  let metadata;
  try {
    metadata = JSON.parse(
      run("psql", [env.SUPABASE_DB_URL, "-qXAt", "-v", "ON_ERROR_STOP=1"], {
        input: sql,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
        env,
      }),
    );
  } catch {
    throw new Error("DOMAIN_STATUS_METADATA_CAPTURE_FAILED");
  }
  if (metadata.transactionReadOnly !== true)
    throw new Error("DOMAIN_STATUS_TRANSACTION_NOT_READONLY");
  const localCatalog = readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => ({
      name,
      sha256: createHash("sha256")
        .update(readFileSync(`supabase/migrations/${name}`))
        .digest("hex"),
    }));
  return validateDomainMigrationStatus({
    lane,
    localCatalog,
    changedMigrations,
    remoteVersions: metadata.remoteVersions,
    hardeningRows: metadata.hardeningRows,
    hardeningManifest: JSON.parse(
      readFileSync(
        "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
        "utf8",
      ),
    ),
    learningManifestBytes: readFileSync(
      "supabase/releases/20261006134804-comun-learning-r0.json",
      "utf8",
    ),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [lane, output] = process.argv.slice(2);
    if (!output) throw new Error("DOMAIN_STATUS_OUTPUT_REQUIRED");
    const result = captureDomainStatus({ lane });
    writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
    console.log("COMUN_DOMAIN_METADATA_CURRENT_LEARNING_DEFERRED");
  } catch (error) {
    // Deliberately never log raw child-process errors or connection arguments.
    console.error(
      error?.message?.startsWith("DOMAIN_")
        ? error.message
        : "DOMAIN_STATUS_BLOCKED",
    );
    process.exitCode = 1;
  }
}
