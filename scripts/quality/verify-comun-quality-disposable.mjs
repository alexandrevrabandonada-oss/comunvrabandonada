import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";
import {
  connectionOptions,
  migrationPath,
  release,
  verifyRelease,
  verifyRemoteQuality,
  version,
} from "./verify-comun-quality-remote.mjs";

// A standalone synthetic PostgreSQL fixture, not an Auth or full-schema proof.
const [container, runId] = process.argv.slice(2);
assert.match(runId ?? "", /^quality-readonly-[a-z0-9-]+$/);
assert.match(container ?? "", /^comun-quality-readonly-[a-z0-9-]+$/);
function ownedTarget() {
  const [info] = JSON.parse(
    execFileSync("docker", ["inspect", container], { encoding: "utf8" }),
  );
  assert.equal(info.Config.Labels["comun.proof.run"], runId);
  assert.equal(info.State.Running, true);
  const ports = info.NetworkSettings.Ports["5432/tcp"];
  assert.equal(ports.length, 1);
  assert.equal(ports[0].HostIp, "127.0.0.1");
  assert.equal(
    info.Config.Env.find((entry) => entry.startsWith("POSTGRES_PASSWORD=")),
    "POSTGRES_PASSWORD=synthetic-quality-proof",
  );
  return { id: info.Id, port: Number(ports[0].HostPort), image: info.Image };
}
const target = ownedTarget();
const config = {
  host: "127.0.0.1",
  port: target.port,
  user: "postgres",
  database: "postgres",
  password: "synthetic-quality-proof",
  connectionTimeoutMillis: 10000,
};
const admin = new pg.Client(config);
const reader = new pg.Client({ ...config, options: connectionOptions });
async function syntheticWrite(sql, params) {
  assert.deepEqual(ownedTarget(), target);
  return admin.query(sql, params);
}
const observedQueries = [];
const inspectedReader = {
  query(sql, params) {
    observedQueries.push(sql);
    return reader.query(sql, params);
  },
};
try {
  verifyRelease(
    JSON.parse(await readFile(`supabase/releases/${release}.json`, "utf8")),
    await readFile(migrationPath),
  );
  await admin.connect();
  await reader.connect();
  // Refuse an existing fixture; this harness only initializes its own fresh lab.
  const existing = await admin.query(
    "select to_regclass('public.comun_quality_metrics_hourly') as relation",
  );
  assert.equal(existing.rows[0].relation, null);
  await syntheticWrite(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema supabase_migrations;
    create table supabase_migrations.schema_migrations(version text primary key);
    create table public.comun_quality_metrics_hourly(synthetic integer);
    alter table public.comun_quality_metrics_hourly enable row level security;
    revoke all on public.comun_quality_metrics_hourly from public, anon, authenticated;
    grant select on public.comun_quality_metrics_hourly to service_role;
    create function public.comun_record_quality_metric(text,text,text,text,integer,text)
    returns void language sql as 'select';
  `);
  await syntheticWrite(
    "insert into supabase_migrations.schema_migrations values($1)",
    [version],
  );
  const positive = await verifyRemoteQuality(inspectedReader);
  assert.equal(positive.result, "COMUN_QUALITY_REMOTE_READ_ONLY_GREEN");
  assert.equal(
    (await reader.query("show transaction_read_only")).rows[0]
      .transaction_read_only,
    "on",
  );
  // The startup guard remains active even after the verifier's rollback.
  await assert.rejects(
    reader.query("insert into public.comun_quality_metrics_hourly values(1)"),
    { code: "25006" },
  );
  await assert.rejects(
    reader.query("create table public.readonly_must_not_exist(id integer)"),
    { code: "25006" },
  );
  await syntheticWrite(
    "delete from supabase_migrations.schema_migrations where version=$1",
    [version],
  );
  await assert.rejects(
    verifyRemoteQuality(inspectedReader),
    /COMUN_QUALITY_MIGRATION_NOT_PROVEN_APPLIED/,
  );
  assert.equal(
    (
      await admin.query(
        "select count(*)::integer as count from supabase_migrations.schema_migrations",
      )
    ).rows[0].count,
    0,
  );
  await syntheticWrite(
    "insert into supabase_migrations.schema_migrations values($1)",
    [version],
  );
  await syntheticWrite(
    "grant select on public.comun_quality_metrics_hourly to anon",
  );
  await assert.rejects(
    verifyRemoteQuality(inspectedReader),
    /COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED/,
  );
  await syntheticWrite(
    "revoke select on public.comun_quality_metrics_hourly from anon",
  );
  await syntheticWrite(
    "alter table public.comun_quality_metrics_hourly disable row level security",
  );
  await assert.rejects(
    verifyRemoteQuality(inspectedReader),
    /COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED/,
  );
  await syntheticWrite(
    "alter table public.comun_quality_metrics_hourly enable row level security",
  );
  await verifyRemoteQuality(inspectedReader);
  assert.equal(
    (
      await admin.query(
        "select count(*)::integer as count from public.comun_quality_metrics_hourly",
      )
    ).rows[0].count,
    0,
  );
  assert.equal(
    (
      await admin.query(
        "select to_regclass('public.readonly_must_not_exist') as relation",
      )
    ).rows[0].relation,
    null,
  );
  assert.ok(
    observedQueries.every((sql) =>
      /^(BEGIN READ ONLY|ROLLBACK|select\b)/i.test(sql),
    ),
  );
  assert.ok(!observedQueries.some((sql) => /pg_notify|set_config/i.test(sql)));
  const artifact = {
    status: "COMUN_QUALITY_DISPOSABLE_READ_ONLY_GREEN",
    scope: "synthetic_metadata_fixture_not_full_schema_or_auth",
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    helperSha256: createHash("sha256")
      .update(await readFile("scripts/quality/verify-comun-quality-remote.mjs"))
      .digest("hex"),
    postgresql: (await admin.query("show server_version")).rows[0]
      .server_version,
    imageId: target.image,
    positive,
    negativeControls: {
      missingHistory: "BLOCKED",
      anonymousGrant: "BLOCKED",
      rlsDisabled: "BLOCKED",
      ddl: "25006",
      dml: "25006",
    },
    verifierQueryCount: observedQueries.length,
    fixtureRestored: true,
    productionAccess: false,
  };
  await mkdir(".ci-artifacts/quality-performance", { recursive: true });
  await writeFile(
    ".ci-artifacts/quality-performance/disposable-readonly.json",
    `${JSON.stringify(artifact, null, 2)}\n`,
  );
  console.log(artifact.status);
} finally {
  await reader.end();
  await admin.end();
}
