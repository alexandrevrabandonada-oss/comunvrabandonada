import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { schemaFingerprintQuery } from "../solo/apply-forward-only.mjs";
import { buildDocuments, query as canonicalQuery } from "../db/verify-canonical-baseline.mjs";

const R3 = "20260924225210";
const R12_MANIFEST = "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const HARDENING_MANIFEST = "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function requireDisposableUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== "postgresql:" ||
      !["127.0.0.1", "localhost"].includes(parsed.hostname) ||
      !/^comun_pr437_prodlike_post_[0-9]+$/.test(parsed.pathname.slice(1)))
    throw new Error("COMUN_R3_DISPOSABLE_DESTINATION_REQUIRED");
  return url;
}

export function requireR3WriteAuthorization({ authorization, expectedSha, disposable }) {
  if (disposable) return;
  if (authorization !== "COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE" ||
      !/^[a-f0-9]{40}$/.test(expectedSha ?? "") ||
      process.env.GITHUB_SHA !== expectedSha ||
      process.env.GITHUB_REF !== "refs/heads/main")
    throw new Error("COMUN_R3_PRODUCTION_WRITE_AUTHORIZATION_REQUIRED");
}

function exactLedger(rows, release, expected) {
  const matches = rows.filter((row) => row.release === release);
  if (matches.length === 0) return "ABSENT";
  if (matches.length !== 1) return "PRESENT_MISMATCH";
  const row = matches[0];
  return row.migration_path === expected.path &&
    row.migration_sha256 === expected.migrationSha256 &&
    row.pre_fingerprint === expected.preFingerprint &&
    row.post_fingerprint === expected.postFingerprint &&
    row.status === "applied" ? "PRESENT_ACCEPTED" : "PRESENT_MISMATCH";
}

export function createR3PostgresAdapter({ url, manifest, disposable = false,
  authorization, expectedSha }) {
  if (!url) throw new Error("COMUN_R3_DATABASE_URL_MISSING");
  if (disposable) requireDisposableUrl(url);
  const r12 = JSON.parse(readFileSync(R12_MANIFEST, "utf8"));
  const hardening = JSON.parse(readFileSync(HARDENING_MANIFEST, "utf8"));
  const connect = async () => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    return client;
  };
  const capture = async () => {
    const db = await connect();
    try {
      await db.query("BEGIN READ ONLY");
      const mode = (await db.query("select current_setting('transaction_read_only') as value")).rows[0]?.value;
      if (mode !== "on") throw new Error("COMUN_R3_CAPTURE_NOT_READ_ONLY");
      const version = (await db.query("show server_version")).rows[0]?.server_version;
      const runnerRows = await db.query(schemaFingerprintQuery);
      const normalized = runnerRows.rows.map((row) => Object.values(row)[0]).join("\n")
        .replace(/\r\n/g, "\n").trimEnd();
      if (!normalized) throw new Error("COMUN_R3_RUNNER_FINGERPRINT_EMPTY");
      const raw = (await db.query(canonicalQuery)).rows[0];
      const canonical = buildDocuments(JSON.parse(Object.values(raw ?? {})[0])).compact;
      const objects = (await db.query(`
        select
          to_regclass('private.comun_relata_collective_entity_candidates') is not null as candidate_table,
          to_regprocedure('public.comun_relata_collective_entity_server_candidate_prepare(uuid,uuid,uuid)') is not null as candidate_bridge,
          (select count(*)::int from pg_trigger t where t.tgname in (
            'comun_relata_candidate_immutable','comun_relata_candidate_consent_invalidate',
            'comun_relata_candidate_representation_invalidate','comun_relata_candidate_entity_invalidate')
            and not t.tgisinternal) as r3_trigger_count,
          (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
            where n.nspname='public' and c.relname like 'comun_relata_collective_entity%')
            as public_collective_relation_count
      `)).rows[0];
      const rows = (await db.query(`
        select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
        from public.comun_schema_releases where release = any($1::text[])
      `, [[r12.release, hardening.release, manifest.release]])).rows;
      return {
        migrations: canonical.canonical.migrations,
        postgresVersion: String(version).match(/^\d+\.\d+/)?.[0],
        runnerFingerprint: hash(normalized),
        canonicalFingerprint: canonical.fingerprint,
        blockingFindings: canonical.security.blockingFindings.length,
        hardeningLedger: exactLedger(rows, hardening.release, {
          path: hardening.migration, migrationSha256: hardening.migrationSha256,
          preFingerprint: hardening.expectedPreFingerprint,
          postFingerprint: hardening.expectedPostFingerprint,
        }),
        r12Ledger: exactLedger(rows, r12.release, {
          path: r12.releaseLedger.migrationPath, migrationSha256: r12.migrationSetSha256,
          preFingerprint: r12.expectedPreFingerprint,
          postFingerprint: r12.expectedPostFingerprint,
        }),
        r3LedgerState: exactLedger(rows, manifest.release, {
          path: manifest.releaseLedger.migrationPath,
          migrationSha256: manifest.migrationSetSha256,
          preFingerprint: manifest.expectedPreFingerprint,
          postFingerprint: manifest.expectedPostFingerprint,
        }),
        r3Present: canonical.canonical.migrations.includes(R3),
        candidateTablePresent: objects.candidate_table,
        candidateBridgePresent: objects.candidate_bridge,
        r3TriggerCount: objects.r3_trigger_count,
        publicCollectiveRelationCount: objects.public_collective_relation_count,
      };
    } finally {
      await db.query("ROLLBACK").catch(() => {});
      await db.end();
    }
  };
  const verifyPost = async () => {
    const db = await connect();
    try {
      await db.query("BEGIN READ ONLY");
      const table = (await db.query(`
        select c.relrowsecurity as rls,c.relforcerowsecurity as force_rls,
          pg_get_userbyid(c.relowner) as owner,
          has_table_privilege('anon',c.oid,'SELECT') as anon_select,
          has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
          has_table_privilege('service_role',c.oid,'SELECT') as service_select
        from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='private' and c.relname='comun_relata_collective_entity_candidates'
      `)).rows[0];
      const bridge = (await db.query(`
        select p.prosecdef as security_definer,pg_get_userbyid(p.proowner) as owner,
          p.proconfig as config,
          has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
          has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
          has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute,
          coalesce((select bool_or(a.grantee=0 and a.privilege_type='EXECUTE')
            from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),false) as public_execute
        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname='comun_relata_collective_entity_server_candidate_prepare'
      `)).rows[0];
      const index = (await db.query(`
        select i.indisunique as unique_index,pg_get_expr(i.indpred,i.indrelid) as predicate
        from pg_index i join pg_class c on c.oid=i.indexrelid
        where c.relname='comun_relata_candidate_one_pending_per_entity'
      `)).rows;
      const triggerCount = (await db.query(`
        select count(*)::int as count from pg_trigger t where t.tgname in (
          'comun_relata_candidate_immutable','comun_relata_candidate_consent_invalidate',
          'comun_relata_candidate_representation_invalidate','comun_relata_candidate_entity_invalidate')
          and not t.tgisinternal
      `)).rows[0].count;
      if (!table?.rls || !table.force_rls || table.owner !== "postgres" ||
          table.anon_select || table.authenticated_select || table.service_select ||
          !bridge?.security_definer || bridge.owner !== "postgres" ||
          !bridge.config?.includes("search_path=pg_catalog") ||
          bridge.anon_execute || bridge.authenticated_execute ||
          bridge.public_execute || !bridge.service_execute ||
          index.length !== 1 || !index[0].unique_index ||
          !index[0].predicate?.includes("pending_legitimacy") || triggerCount !== 4)
        throw new Error("COMUN_R3_POST_STRUCTURE_INVALID");
      return { status: "COMUN_R3_POST_STRUCTURE_ACCEPTED", transactionReadOnly: "on" };
    } finally {
      await db.query("ROLLBACK").catch(() => {});
      await db.end();
    }
  };
  const withWriteTransaction = async (operation) => {
    requireR3WriteAuthorization({ authorization, expectedSha, disposable });
    const db = await connect();
    try {
      await db.query("BEGIN");
      await operation(db);
      await db.query("COMMIT");
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      await db.end();
    }
  };
  const applyMigration = async (migration) => {
    if (manifest.migrations.length !== 1 ||
        manifest.migrations[0].path !== migration.path ||
        manifest.migrations[0].sha256 !== migration.sha256 ||
        migration.version !== R3)
      throw new Error("COMUN_R3_MIGRATION_NOT_IN_RELEASE");
    const sql = readFileSync(migration.path, "utf8");
    if (hash(sql) !== migration.sha256 ||
        !/^begin;[\s\S]*commit;\s*$/i.test(sql.trim()))
      throw new Error("COMUN_R3_MIGRATION_BYTES_INVALID");
    const body = sql.trim().replace(/^begin;\s*/i, "").replace(/\s*commit;\s*$/i, "");
    await withWriteTransaction(async (db) => {
      await db.query(body);
      await db.query("insert into supabase_migrations.schema_migrations(version) values ($1)", [R3]);
    });
  };
  const recordLedger = async () => withWriteTransaction(async (db) => {
    await db.query(`insert into public.comun_schema_releases
      (release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status)
      values ($1,$2,$3,$4,$5,'applied')`, [manifest.release,
      manifest.releaseLedger.migrationPath, manifest.migrationSetSha256,
      manifest.expectedPreFingerprint, manifest.expectedPostFingerprint]);
  });
  return { capture, verifyPost, applyMigration, recordLedger };
}
