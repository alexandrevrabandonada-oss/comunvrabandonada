import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import {
  query as canonicalQuery,
  buildDocuments,
} from "../db/verify-canonical-baseline.mjs";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

export function requireDisposableConnection(url) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
    !/^comun_pr437_prodlike_post_[0-9]+$/.test(parsed.pathname.slice(1)) ||
    !parsed.port
  )
    throw new Error("COMUN_49_2_DISPOSABLE_DESTINATION_REQUIRED");
  return url;
}

export function createPostgresAdapter({
  url,
  manifest,
  disposable = false,
  authorization,
}) {
  if (disposable) requireDisposableConnection(url);
  else if (
    authorization?.kind !== "COMUN_49_2_PRODUCTION_SCHEMA_WRITE" ||
    !/^[a-f0-9]{40}$/.test(authorization.sha ?? "") ||
    authorization.sha !== process.env.GITHUB_SHA ||
    process.env.GITHUB_REF !== "refs/heads/main"
  )
    throw new Error("COMUN_49_2_PRODUCTION_WRITE_AUTHORIZATION_REQUIRED");
  const connect = async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    return client;
  };
  const withWriteTransaction = async (operation) => {
    const client = await connect();
    try {
      await client.query("BEGIN");
      await operation(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      await client.end();
    }
  };
  return {
    capture: async () => {
      const client = await connect();
      try {
        await client.query("BEGIN READ ONLY");
        const mode = await client.query(
          "select current_setting('transaction_read_only') as value",
        );
        if (mode.rows[0]?.value !== "on")
          throw new Error("COMUN_49_2_CAPTURE_NOT_READ_ONLY");
        const runnerRows = await client.query(schemaFingerprintQuery);
        const normalized = runnerRows.rows
          .map((row) => Object.values(row)[0])
          .join("\n")
          .replace(/\r\n/g, "\n")
          .trimEnd();
        if (!normalized) throw new Error("COMUN_49_2_RUNNER_FINGERPRINT_EMPTY");
        const rawRows = await client.query(canonicalQuery);
        const raw = JSON.parse(Object.values(rawRows.rows[0] ?? {})[0]);
        const canonical = buildDocuments(raw).compact;
        const consent = await client.query(`
          select
            (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='private' and c.relname in (
               'comun_relata_collective_entities', 'comun_relata_collective_entity_representations',
               'comun_relata_collective_entity_consents', 'comun_relata_collective_entity_events'))
            + (select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace
               where n.nspname='private' and p.proname in (
                 'comun_relata_collective_entity_create_internal',
                 'comun_relata_collective_entity_consent_set_internal')) as count`);
        const releaseRows = await client.query(
          `select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
             from public.comun_schema_releases where release = any($1::text[])`,
          [
            [
              manifest.release,
              "20260922120000-canonical-security-hardening-v2",
            ],
          ],
        );
        const bundle = releaseRows.rows.find(
          (row) => row.release === manifest.release,
        );
        const hardening = releaseRows.rows.find(
          (row) =>
            row.release === "20260922120000-canonical-security-hardening-v2",
        );
        const hardeningManifest = JSON.parse(
          readFileSync(
            "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
            "utf8",
          ),
        );
        const hardeningAccepted =
          hardening &&
          hardening.migration_path === hardeningManifest.migration &&
          hardening.migration_sha256 === hardeningManifest.migrationSha256 &&
          hardening.pre_fingerprint ===
            hardeningManifest.expectedPreFingerprint &&
          hardening.post_fingerprint ===
            hardeningManifest.expectedPostFingerprint &&
          hardening.status === "applied";
        const bundleLedgerState = !bundle
          ? "ABSENT"
          : bundle.migration_path === manifest.releaseLedger.migrationPath &&
              bundle.migration_sha256 === manifest.migrationSetSha256 &&
              bundle.pre_fingerprint === manifest.expectedPreFingerprint &&
              bundle.post_fingerprint === manifest.expectedPostFingerprint &&
              bundle.status === "applied"
            ? "PRESENT_ACCEPTED"
            : "PRESENT_MISMATCH";
        return {
          migrations: canonical.canonical.migrations,
          runnerFingerprint: hash(normalized),
          canonicalFingerprint: canonical.fingerprint,
          blockingFindings: canonical.security.blockingFindings.length,
          releaseLedgerState: hardeningAccepted
            ? "PRESENT_ACCEPTED"
            : "ABSENT_OR_MISMATCH",
          consentObjectCount: consent.rows[0]?.count,
          bundleLedgerState,
        };
      } finally {
        await client.query("ROLLBACK").catch(() => {});
        await client.end();
      }
    },
    applyMigration: async (migration) => {
      if (
        !manifest.migrations.some(
          (item) =>
            item.path === migration.path && item.sha256 === migration.sha256,
        )
      )
        throw new Error("COMUN_49_2_MIGRATION_NOT_IN_BUNDLE");
      const sql = readFileSync(migration.path, "utf8");
      if (
        hash(sql) !== migration.sha256 ||
        !/^begin;[\s\S]*commit;\s*$/i.test(sql.trim())
      )
        throw new Error("COMUN_49_2_MIGRATION_BYTES_INVALID");
      const body = sql
        .trim()
        .replace(/^begin;\s*/i, "")
        .replace(/\s*commit;\s*$/i, "");
      await withWriteTransaction(async (client) => {
        await client.query(body);
        await client.query(
          "insert into supabase_migrations.schema_migrations(version) values ($1)",
          [migration.version],
        );
      });
    },
    recordLedger: async () =>
      withWriteTransaction(async (client) => {
        await client.query(
          `insert into public.comun_schema_releases
          (release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
         values ($1,$2,$3,$4,$5,'applied')`,
          [
            manifest.release,
            manifest.releaseLedger.migrationPath,
            manifest.migrationSetSha256,
            manifest.expectedPreFingerprint,
            manifest.expectedPostFingerprint,
          ],
        );
      }),
  };
}
