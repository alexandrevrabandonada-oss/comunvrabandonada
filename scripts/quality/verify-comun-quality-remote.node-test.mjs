import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import yaml from "js-yaml";
import {
  connectionOptions,
  controls,
  migrationPath,
  release,
  verifyRelease,
  verifyRemoteQuality,
  version,
} from "./verify-comun-quality-remote.mjs";

const row = (value) => ({ rows: [value] });
function connection(overrides = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      const key = sql.includes("current_setting")
        ? "mode"
        : sql.includes("schema_migrations")
          ? "history"
          : sql.includes("to_regclass")
            ? "controls"
            : sql;
      const response = overrides[key];
      if (response instanceof Error) throw response;
      if (response !== undefined) return response;
      if (key === "mode") return row({ read_only: "on" });
      if (key === "history") return row({ applied: true });
      if (key === "controls")
        return row(Object.fromEntries(controls.map((name) => [name, true])));
      return { rows: [] };
    },
  };
}

test("successful verification inspects exact history and controls, then rolls back without any transport", async () => {
  const client = connection();
  const report = await verifyRemoteQuality(client);
  assert.equal(report.result, "COMUN_QUALITY_REMOTE_READ_ONLY_GREEN");
  assert.equal(report.rollback, "CONFIRMED");
  for (const key of [
    "migrationsApplied",
    "schemaWrites",
    "ledgerWrites",
    "notifications",
  ])
    assert.equal(report[key], 0);
  assert.equal(client.calls[0].sql, "BEGIN READ ONLY");
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  assert.deepEqual(client.calls[2].params, [version]);
  assert.equal(client.calls.length, 5);
  assert.ok(
    client.calls.slice(1, -1).every(({ sql }) => /^select\b/i.test(sql)),
  );
  assert.ok(
    client.calls.every(
      ({ sql }) =>
        !/pg_notify|set_config|\b(insert|update|delete|create|alter|drop)\b/i.test(
          sql,
        ),
    ),
  );
  assert.ok(!JSON.stringify(report).includes("connectionString"));
});

for (const value of [false, "true", null])
  test(`absent or malformed migration history fails closed (${value})`, async () => {
    const client = connection({ history: row({ applied: value }) });
    await assert.rejects(
      verifyRemoteQuality(client),
      /COMUN_QUALITY_MIGRATION_NOT_PROVEN_APPLIED/,
    );
    assert.equal(client.calls.at(-1).sql, "ROLLBACK");
    assert.equal(client.calls.length, 4);
  });
for (const mode of [row({ read_only: "off" }), { rows: [] }, row({})])
  test(`read-only must be positively established: ${JSON.stringify(mode)}`, async () => {
    const client = connection({ mode });
    await assert.rejects(
      verifyRemoteQuality(client),
      /COMUN_QUALITY_READ_ONLY_REQUIRED/,
    );
    assert.equal(client.calls.length, 3);
    assert.equal(client.calls.at(-1).sql, "ROLLBACK");
  });
for (const name of controls)
  test(`original control remains mandatory: ${name}`, async () => {
    const values = Object.fromEntries(
      controls.map((key) => [key, key !== name]),
    );
    await assert.rejects(
      verifyRemoteQuality(connection({ controls: row(values) })),
      /COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED/,
    );
  });
for (const result of [
  { rows: [] },
  row({}),
  { rows: [{}, {}] },
  row({
    ...Object.fromEntries(controls.map((key) => [key, true])),
    unexpected: true,
  }),
])
  test(`unexpected postflight shape cannot pass: ${JSON.stringify(result)}`, async () => {
    await assert.rejects(
      verifyRemoteQuality(connection({ controls: result })),
      /COMUN_QUALITY_REMOTE_POSTFLIGHT_FAILED/,
    );
  });
test("database error is sanitized and rolled back", async () => {
  const client = connection({
    history: new Error("postgres://private-secret@example.invalid/business"),
  });
  await assert.rejects(verifyRemoteQuality(client), {
    message: "COMUN_QUALITY_REMOTE_READ_ONLY_FAILED_SANITIZED",
  });
  assert.equal(client.calls.at(-1).sql, "ROLLBACK");
});
test("rollback failure never produces a success artifact", async () => {
  await assert.rejects(
    verifyRemoteQuality(connection({ ROLLBACK: new Error("private") })),
    /COMUN_QUALITY_READ_ONLY_ROLLBACK_FAILED/,
  );
});
test("pinned release and migration bytes are checked independently", async () => {
  const manifest = JSON.parse(
    await readFile(`supabase/releases/${release}.json`, "utf8"),
  );
  const migration = await readFile(migrationPath);
  verifyRelease(manifest, migration);
  for (const field of ["release", "migration", "migrationSha256"])
    assert.throws(
      () => verifyRelease({ ...manifest, [field]: "changed" }, migration),
      /COMUN_QUALITY_MIGRATION_CHECKSUM_MISMATCH/,
    );
  assert.throws(
    () =>
      verifyRelease(manifest, Buffer.concat([migration, Buffer.from("\n")])),
    /COMUN_QUALITY_MIGRATION_CHECKSUM_MISMATCH/,
  );
});
test("automatic workflow uses inspection only and scopes Production credential to that step", async () => {
  const source = await readFile(
    ".github/workflows/comun-quality-performance.yml",
    "utf8",
  );
  const workflow = yaml.load(source);
  const job = workflow.jobs["post-merge"];
  assert.ok(job.if.includes("github.event_name == 'push'"));
  assert.equal(job.env.SUPABASE_DB_URL, undefined);
  const credentialSteps = job.steps.filter((step) => step.env?.SUPABASE_DB_URL);
  assert.equal(credentialSteps.length, 1);
  const step = credentialSteps[0];
  assert.equal(
    step.run,
    "node scripts/quality/verify-comun-quality-remote.mjs",
  );
  assert.equal(step.env.PGOPTIONS, connectionOptions);
  assert.equal(step.env.SUPABASE_DB_URL, "${{ secrets.SUPABASE_DB_URL }}");
  assert.ok(!source.includes("apply-comun-quality-remote.mjs"));
  for (const other of job.steps.filter((value) => value !== step))
    assert.ok(!JSON.stringify(other).includes("secrets.SUPABASE"));
  const helper = await readFile(
    "scripts/quality/verify-comun-quality-remote.mjs",
    "utf8",
  );
  assert.match(helper, /options: connectionOptions/);
  assert.match(helper, /validateRemoteTarget\(/);
  assert.ok(!/pg_notify|set_config|supabase db lint/.test(helper));
});
