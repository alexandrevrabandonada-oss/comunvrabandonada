import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createPostgresAdapter } from "./postgres-adapter.mjs";
import { rehearsePrivateReleasePromotion } from "./promotion-runner.mjs";
import { classifyPrivateRelease } from "./state-machine.mjs";

const MANIFEST_PATH =
  "supabase/release-bundles/20260924-comun-49-2-private-collective-runtime-r1-r2.json";
const BASELINE_PATH =
  "reports/current/comun-49-2-private-release-production-pre.json";

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

function arg(name) {
  return process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
}

function requireContext({ write }) {
  const expectedSha = arg("expected-sha") ?? process.env.COMUN_49_2_EXPECTED_MAIN_SHA;
  const databaseUrl = process.env.SUPABASE_DB_URL;
  if (!databaseUrl) throw new Error("COMUN_49_2_PRODUCTION_DB_URL_MISSING");
  if (!/^[a-f0-9]{40}$/.test(expectedSha ?? ""))
    throw new Error("COMUN_49_2_EXPECTED_MAIN_SHA_INVALID");
  if (process.env.GITHUB_SHA !== expectedSha)
    throw new Error("COMUN_49_2_GITHUB_SHA_MISMATCH");
  if (process.env.GITHUB_REF !== "refs/heads/main")
    throw new Error("COMUN_49_2_MAIN_REF_REQUIRED");
  if (write && process.env.COMUN_49_2_SCHEMA_WRITE_AUTHORIZATION !==
      "COMUN_49_2_PRODUCTION_SCHEMA_WRITE")
    throw new Error("COMUN_49_2_PRODUCTION_WRITE_AUTHORIZATION_REQUIRED");
  return { expectedSha, databaseUrl };
}

function outputPath() {
  return arg("output") ?? ".ci-artifacts/comun-49-2-private-schema-promotion/result.json";
}

function persist(document) {
  const path = outputPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
}

async function classify(adapter) {
  const capture = await adapter.capture();
  const classification = classifyPrivateRelease(capture, manifest, {
    migrations: baseline.migrations,
  });
  if (classification.state === "DIVERGED")
    throw new Error("COMUN_49_2_PRIVATE_RELEASE_DIVERGED");
  return { capture, classification };
}

async function verifyPrivatePost({ databaseUrl }) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    const mode = await client.query(
      "select current_setting('transaction_read_only') as value",
    );
    if (mode.rows[0]?.value !== "on")
      throw new Error("COMUN_49_2_POSTFLIGHT_NOT_READ_ONLY");

    const migrations = await client.query(
      `select version
         from supabase_migrations.schema_migrations
        where version = any($1::text[])
        order by version`,
      [manifest.migrations.map((item) => item.version)],
    );
    if (
      JSON.stringify(migrations.rows.map((row) => row.version)) !==
      JSON.stringify(manifest.migrations.map((item) => item.version))
    ) throw new Error("COMUN_49_2_POST_MIGRATION_HISTORY_INVALID");

    const tables = await client.query(`
      select relname
        from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='private'
         and relname in (
           'comun_relata_collective_entities',
           'comun_relata_collective_entity_representations',
           'comun_relata_collective_entity_consents',
           'comun_relata_collective_entity_events'
         )
       order by relname`);
    if (tables.rows.length !== 4)
      throw new Error("COMUN_49_2_POST_PRIVATE_TABLES_INVALID");

    const bridges = await client.query(`
      select p.proname,
             p.prosecdef,
             coalesce(array_to_string(p.proconfig, ','), '') as config,
             pg_get_userbyid(p.proowner) as owner,
             has_function_privilege('public', p.oid, 'EXECUTE') as public_execute,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
             has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
        from pg_proc p
        join pg_namespace n on n.oid=p.pronamespace
       where n.nspname='public'
         and p.proname like 'comun_relata_collective_entity_server_%'
       order by p.proname`);
    if (
      bridges.rows.length !== 4 ||
      bridges.rows.some((row) =>
        row.prosecdef !== true ||
        row.config !== "search_path=pg_catalog" ||
        row.owner !== "postgres" ||
        row.public_execute === true ||
        row.anon_execute === true ||
        row.authenticated_execute === true ||
        row.service_role_execute !== true
      )
    ) throw new Error("COMUN_49_2_POST_BRIDGE_SECURITY_INVALID");

    const publicRelations = await client.query(`
      select c.relname
        from pg_class c
        join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public'
         and c.relname like 'comun_relata_collective_entity%'
       order by c.relname`);
    if (publicRelations.rows.length !== 0)
      throw new Error("COMUN_49_2_POST_PUBLIC_PROJECTION_PRESENT");

    const ledger = await client.query(
      `select release,migration_path,migration_sha256,pre_fingerprint,post_fingerprint,status
         from public.comun_schema_releases
        where release=$1`,
      [manifest.release],
    );
    const row = ledger.rows[0];
    if (
      ledger.rows.length !== 1 ||
      row.migration_path !== manifest.releaseLedger.migrationPath ||
      row.migration_sha256 !== manifest.migrationSetSha256 ||
      row.pre_fingerprint !== manifest.expectedPreFingerprint ||
      row.post_fingerprint !== manifest.expectedPostFingerprint ||
      row.status !== "applied"
    ) throw new Error("COMUN_49_2_POST_BUNDLE_LEDGER_INVALID");

    return {
      transactionReadOnly: mode.rows[0].value,
      migrationVersions: migrations.rows.map((item) => item.version),
      privateTables: tables.rows.map((item) => item.relname),
      bridges: bridges.rows.map((item) => ({
        name: item.proname,
        owner: item.owner,
        securityDefiner: item.prosecdef,
        searchPath: item.config,
        publicExecute: item.public_execute,
        anonExecute: item.anon_execute,
        authenticatedExecute: item.authenticated_execute,
        serviceRoleExecute: item.service_role_execute,
      })),
      publicCollectiveRelations: publicRelations.rows.map((item) => item.relname),
      bundleLedgerState: "PRESENT_ACCEPTED",
    };
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
}

async function run() {
  const mode = arg("mode") ?? "inspect";
  const write = mode === "promote";
  const { expectedSha, databaseUrl } = requireContext({ write });
  const adapter = createPostgresAdapter({
    url: databaseUrl,
    manifest,
    authorization: {
      kind: "COMUN_49_2_PRODUCTION_SCHEMA_WRITE",
      sha: expectedSha,
    },
  });

  if (mode === "inspect") {
    const capture = await adapter.capture();
    const classification = classifyPrivateRelease(capture, manifest, {
      migrations: baseline.migrations,
    });
    persist({
      scope: "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION",
      mode,
      sha: expectedSha,
      state: classification.state,
      action: classification.action,
      capture,
    });
    console.log(
      `COMUN_49_2_PRIVATE_SCHEMA_INSPECT:${classification.state}`,
    );
    return;
  }

  if (mode === "preflight") {
    const { capture, classification } = await classify(adapter);
    persist({
      scope: "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION",
      mode,
      sha: expectedSha,
      state: classification.state,
      action: classification.action,
      capture,
    });
    console.log(
      `COMUN_49_2_PRIVATE_SCHEMA_PREFLIGHT:${classification.state}`,
    );
    return;
  }

  if (mode === "promote") {
    const before = await classify(adapter);
    const expectedActionsByState = {
      PRE: ["R1", "R2", "LEDGER"],
      PARTIAL_R1: ["R2", "LEDGER"],
      POST_PENDING_LEDGER: ["LEDGER"],
      POST: [],
    };
    const expectedActions = expectedActionsByState[before.classification.state];
    if (!expectedActions)
      throw new Error("COMUN_49_2_PRIVATE_SCHEMA_PROMOTION_STATE_INVALID");

    const result = await rehearsePrivateReleasePromotion({
      manifest,
      baseline,
      capture: adapter.capture,
      applyMigration: adapter.applyMigration,
      recordLedger: adapter.recordLedger,
    });
    if (
      result.state !== "POST" ||
      JSON.stringify(result.actions) !== JSON.stringify(expectedActions)
    ) throw new Error("COMUN_49_2_PRIVATE_SCHEMA_PROMOTION_INCOMPLETE");

    const after = await classify(adapter);
    if (after.classification.state !== "POST")
      throw new Error("COMUN_49_2_PRIVATE_SCHEMA_POST_STATE_INVALID");
    const structural = await verifyPrivatePost({ databaseUrl });

    persist({
      scope: "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION",
      mode,
      sha: expectedSha,
      before: {
        state: before.classification.state,
        capture: before.capture,
      },
      actions: result.actions,
      after: {
        state: after.classification.state,
        capture: after.capture,
      },
      structural,
      publicProjectionCreated: false,
      r3Opened: false,
    });
    console.log("COMUN_49_2_PRIVATE_SCHEMA_PRODUCTION_POST_PROVED");
    return;
  }

  if (mode === "postflight") {
    const after = await classify(adapter);
    if (after.classification.state !== "POST")
      throw new Error(
        `COMUN_49_2_PRIVATE_SCHEMA_POSTFLIGHT_NOT_POST:${after.classification.state}`,
      );
    const structural = await verifyPrivatePost({ databaseUrl });
    persist({
      scope: "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION",
      mode,
      sha: expectedSha,
      state: after.classification.state,
      capture: after.capture,
      structural,
      publicProjectionCreated: false,
      r3Opened: false,
    });
    console.log("COMUN_49_2_PRIVATE_SCHEMA_POSTFLIGHT_GREEN");
    return;
  }

  throw new Error("COMUN_49_2_PRIVATE_SCHEMA_MODE_INVALID");
}

try {
  await run();
} catch (error) {
  const marker =
    error instanceof Error && /^[A-Z0-9_:.-]+$/.test(error.message)
      ? error.message
      : "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION_FAILED";
  try {
    persist({
      scope: "COMUN_49_2_PRIVATE_SCHEMA_PROMOTION",
      mode: arg("mode") ?? "unknown",
      status: "BLOCKED",
      marker,
    });
  } catch {}
  console.error(marker);
  process.exitCode = 1;
}
