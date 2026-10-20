import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { captureDomainStatus } from "./capture-readonly-domain-migration-status.mjs";

const manifest = JSON.parse(
  readFileSync(
    "supabase/releases/20260922120000-canonical-security-hardening-v2.json",
    "utf8",
  ),
);
const metadata = {
  transactionReadOnly: true,
  remoteVersions: readdirSync("supabase/migrations")
    .filter((n) => n.endsWith(".sql") && !n.startsWith("20261006134804_"))
    .map((n) => n.split("_")[0]),
  hardeningRows: [
    {
      release: manifest.release,
      migration_path: manifest.migration,
      migration_sha256: manifest.migrationSha256,
      pre_fingerprint: manifest.expectedPreFingerprint,
      post_fingerprint: manifest.expectedPostFingerprint,
      status: "applied",
    },
  ],
};
const env = {
  SUPABASE_DB_URL: "postgresql://synthetic:private@example.invalid/postgres",
  PGSSLMODE: "verify-full",
  PGSSLROOTCERT: "scripts/security/supabase-prod-ca-2021.crt",
  PGOPTIONS: "-c default_transaction_read_only=on",
};
function runner(value = metadata, changed = "") {
  return (command, args, options) => {
    if (command === "git") {
      assert.deepEqual(args, [
        "diff",
        "--name-only",
        "origin/main...HEAD",
        "--",
        "supabase/migrations",
      ]);
      return changed;
    }
    assert.equal(command, "psql");
    assert.equal(args[0], env.SUPABASE_DB_URL);
    assert.match(options.input, /^begin read only;/);
    assert.match(options.input, /rollback;$/);
    assert.doesNotMatch(
      options.input,
      /\b(insert|update|delete|alter|grant|create)\b/i,
    );
    assert.equal(options.env.PGSSLMODE, "verify-full");
    return JSON.stringify(value);
  };
}
test("capture uses verified TLS and metadata only, retaining deferred learning", () => {
  const result = captureDomainStatus({ lane: "48-2-a", env, run: runner() });
  assert.equal(result.state, "domain-current-with-deferred-learning");
  assert.equal(result.migrationExecutionAuthorized, false);
});
test("transport and changed migrations refuse before any database access", () => {
  for (const key of Object.keys(env))
    assert.throws(() =>
      captureDomainStatus({
        lane: "48-2-a",
        env: { ...env, [key]: "" },
        run: () => assert.fail("transport invoked"),
      }),
    );
  assert.throws(() =>
    captureDomainStatus({
      lane: "48-2-a",
      env,
      run: runner(metadata, "supabase/migrations/20990101000000_new.sql"),
    }),
  );
});

test("connection URI cannot override verified TLS or read-only defaults", () => {
  for (const suffix of [
    "?sslmode=disable",
    "?sslmode=require",
    "?sslmode=prefer",
    "?sslrootcert=system",
    "?options=-c%20default_transaction_read_only%3Doff",
    "?service=other",
    "?host=other.invalid",
    "?sslmode=verify-full&sslmode=disable",
    "?%73slmode=disable",
  ]) {
    assert.throws(
      () =>
        captureDomainStatus({
          lane: "48-2-a",
          env: { ...env, SUPABASE_DB_URL: env.SUPABASE_DB_URL + suffix },
          run: () => assert.fail("transport invoked"),
        }),
      { message: "DOMAIN_STATUS_CONNECTION_OVERRIDE_REFUSED" },
    );
  }
  for (const url of [
    "host=example.invalid sslmode=disable",
    "https://example.invalid",
    "invalid",
  ]) {
    assert.throws(
      () =>
        captureDomainStatus({
          lane: "48-2-a",
          env: { ...env, SUPABASE_DB_URL: url },
          run: () => assert.fail("transport invoked"),
        }),
      { message: "DOMAIN_STATUS_CONNECTION_URI_REQUIRED" },
    );
  }
});
test("capture rejects nonreadonly, unknown, missing and malformed remote metadata", () => {
  for (const value of [
    { ...metadata, transactionReadOnly: false },
    { ...metadata, remoteVersions: [] },
    {
      ...metadata,
      remoteVersions: [...metadata.remoteVersions, "20990101000000"],
    },
    { ...metadata, hardeningRows: [] },
  ])
    assert.throws(() =>
      captureDomainStatus({ lane: "48-2-a", env, run: runner(value) }),
    );
});
test("child errors are sanitized rather than disclosing connection arguments", () => {
  assert.throws(
    () =>
      captureDomainStatus({
        lane: "48-2-a",
        env,
        run: (command) => {
          if (command === "git") return "";
          throw Error(env.SUPABASE_DB_URL);
        },
      }),
    { message: "DOMAIN_STATUS_METADATA_CAPTURE_FAILED" },
  );
});
test("all workflow routes preserve schema metadata and strict candidate/global paths", () => {
  for (let i = 1; i <= 6; i++) {
    const lane = `48-4-a${i}`,
      w = load(
        readFileSync(`.github/workflows/comun-${lane}-preflight.yml`, "utf8"),
      ),
      steps = Object.values(w.jobs).flatMap((j) => j.steps);
    const plan = steps.find((s) =>
      s.run?.includes("capture-readonly-domain-migration-status.mjs"),
    );
    assert.ok(plan);
    assert.equal(plan.env.PGSSLMODE, "verify-full");
    assert.equal(plan.env.PGOPTIONS, env.PGOPTIONS);
    assert.match(plan.run, /= promoted.*COMUN_MIGRATION_LANE_MODE.*= none/);
    assert.match(plan.run, /readonly-reconciled-migration-plan.mjs/);
    assert.match(plan.run, /--dry-run/);
    const earlier = steps.slice(0, steps.indexOf(plan));
    assert.ok(
      earlier.some(
        (s) =>
          s.run?.includes("begin read only;") &&
          s.run.includes("BLOCKED_REMOTE_SCHEMA_DRIFT"),
      ),
    );
  }
  const w = load(
    readFileSync(".github/workflows/comun-48-2-a-remote-preflight.yml", "utf8"),
  );
  const step = w.jobs["remote-read-only-preflight"].steps.find(
    (s) =>
      s.name ===
      "Reconcile remote migration metadata in a read-only transaction",
  );
  assert.match(step.run, /pending.includes\('20261006134804'\)/);
  assert.match(step.run, /schema.businessRowsRead !== false/);
  assert.match(step.run, /unknown.length \|\| observatoryMigrations.length/);
  assert.match(step.run, /pending.length \|\| unknown.length/);
});

test("historical pauta and Auth transport scopes keep verified TLS and their schema checks", () => {
  for (const lane of [
    "48-3-a1",
    "48-3-b1",
    "48-3-c1",
    "48-3-d1",
    "48-3-e2",
    "48-3-e3",
    "p1g",
  ]) {
    const workflow = load(
      readFileSync(`.github/workflows/comun-${lane}-preflight.yml`, "utf8"),
    );
    const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
    const plan = steps.find((step) =>
      step.run?.includes(
        `capture-readonly-domain-migration-status.mjs ${lane} `,
      ),
    );
    assert.ok(plan, lane);
    assert.match(plan.run, /COMUN_MIGRATION_LANE_MODE.*none/);
    assert.match(
      plan.run,
      /node scripts\/ci\/readonly-reconciled-migration-plan.mjs/,
    );
    const metadata = steps.filter((step) =>
      step.run?.includes('psql "$SUPABASE_DB_URL"'),
    );
    assert.ok(metadata.length, lane);
    for (const step of [...metadata, plan]) {
      assert.equal(
        step.env.PGSSLROOTCERT,
        "${{ github.workspace }}/scripts/security/supabase-prod-ca-2021.crt",
      );
      assert.equal(step.env.PGSSLMODE, "verify-full");
      assert.equal(step.env.PGOPTIONS, "-c default_transaction_read_only=on");
      assert.doesNotMatch(
        step.run,
        /sslmode=(disable|require)|NODE_TLS_REJECT_UNAUTHORIZED/,
      );
    }
    for (const step of metadata) {
      assert.match(step.run, /begin read only;/);
      assert.match(step.run, /rollback;/);
    }
  }
});
