import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { load as parse } from "js-yaml";

const manifestPath =
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const migrations = [
  manifest.migration,
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
];
const row = {
  release: manifest.release,
  migration_path: manifest.migration,
  migration_sha256: manifest.migrationSha256,
  pre_fingerprint: manifest.expectedPreFingerprint,
  post_fingerprint: manifest.expectedPostFingerprint,
  status: "applied",
};

const observatoryWorkflow = parse(
  readFileSync(".github/workflows/comun-48-2-a-remote-preflight.yml", "utf8"),
);
const observatoryStep = Object.values(observatoryWorkflow.jobs)
  .flatMap((job) => job.steps)
  .find(
    (step) =>
      step.name ===
      "Reconcile remote migration metadata in a read-only transaction",
  );
test("48.2-A: only exact applied external Hardening is reconciled; schema and unknown drift remain blocked", () => {
  const root = mkdtempSync(join(tmpdir(), "comun-observatory-plan-"));
  try {
    for (const path of [
      manifestPath,
      "scripts/ci/readonly-reconciled-migration-plan.mjs",
      ...migrations,
    ]) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      cpSync(path, join(root, path));
    }
    const normal = "20260810194054";
    writeFileSync(
      join(root, `supabase/migrations/${normal}_normal.sql`),
      "-- test-only inventory",
    );
    const bin = join(root, "bin");
    mkdirSync(bin);
    writeFileSync(
      join(bin, "psql"),
      `#!/usr/bin/env node
const fs=require('node:fs'); const sql=fs.readFileSync(0,'utf8');
if(!sql.startsWith('begin read only;') || !sql.trim().endsWith('rollback;') || /\\b(insert|update|delete|alter|grant|create)\\b/i.test(sql)) process.exit(91);
console.log(sql.includes('public.comun_schema_releases') ? process.env.TEST_LEDGER : sql.includes('json_build_object') ? process.env.TEST_SCHEMA : process.env.TEST_VERSIONS);
`,
      { mode: 0o755 },
    );
    writeFileSync(
      join(bin, "git"),
      "#!/usr/bin/env node\nconsole.log(process.env.TEST_CHANGED);\n",
      { mode: 0o755 },
    );
    const schema = Object.fromEntries(
      [
        "dbTransportAvailable",
        "psqlReadOnlyAvailable",
        "p4ProjectionPresent",
        "p4ProjectionRlsEnabled",
        "p4PublicGeometryPresent",
        "p6cCApplied",
        "transactionReadOnly",
      ].map((key) => [key, true]),
    );
    schema.businessRowsRead = false;
    for (const scenario of [
      { ledger: [row], versions: normal, schema, pass: true },
      { ledger: [], versions: normal, schema, pass: false },
      {
        ledger: [{ ...row, status: "pending" }],
        versions: normal,
        schema,
        pass: false,
      },
      {
        ledger: [{ ...row, migration_sha256: "wrong" }],
        versions: normal,
        schema,
        pass: false,
      },
      {
        ledger: [row],
        versions: normal + "\n20990101000000",
        schema,
        pass: false,
      },
      { ledger: [row], versions: "", schema, pass: false },
      {
        ledger: [row],
        versions: normal,
        schema: { ...schema, p4ProjectionRlsEnabled: false },
        pass: false,
      },
      {
        ledger: [row],
        versions: normal,
        schema: { ...schema, businessRowsRead: true },
        pass: false,
      },
      {
        ledger: [row],
        versions: normal,
        schema,
        changed: "supabase/migrations/20990101000000_unknown.sql",
        pass: false,
      },
    ]) {
      // Each negative case owns its artifact; never read a previous scenario's proof.
      const diagnosticPath = join(
        root,
        ".ci-artifacts/48-2-a-preflight/drift-diagnostic.json",
      );
      rmSync(diagnosticPath, { force: true });
      const result = spawnSync("bash", ["-c", observatoryStep.run], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          RUNNER_TEMP: root,
          SUPABASE_DB_URL: "postgresql://test.invalid/test",
          TEST_LEDGER: JSON.stringify(scenario.ledger),
          TEST_SCHEMA: JSON.stringify(scenario.schema),
          TEST_VERSIONS: scenario.versions,
          TEST_CHANGED: scenario.changed || "",
        },
      });
      assert.equal(result.status === 0, scenario.pass, result.stderr);
      if (scenario.versions === "") {
        // The shell rejects an empty history before the diagnostic SQL/Node phase.
        assert.equal(existsSync(diagnosticPath), false);
      } else if (JSON.stringify(scenario.ledger) === JSON.stringify([row])) {
        const diagnostic = JSON.parse(
          readFileSync(
            join(root, ".ci-artifacts/48-2-a-preflight/drift-diagnostic.json"),
            "utf8",
          ),
        );
        assert.equal(
          diagnostic.businessRowsRead,
          scenario.schema.businessRowsRead,
        );
        assert.equal(diagnostic.exactExternalHardeningLedgerAccepted, true);
        assert.deepEqual(
          diagnostic.unknownRemoteMigrations,
          scenario.versions.includes("20990101000000")
            ? ["20990101000000"]
            : [],
        );
        assert.deepEqual(
          diagnostic.pendingNormalMigrations,
          scenario.versions === "" ? [normal] : [],
        );
        assert.deepEqual(
          diagnostic.failedSchemaControls,
          scenario.schema.p4ProjectionRlsEnabled === false
            ? ["p4ProjectionRlsEnabled"]
            : [],
        );
      }
      for (const path of migrations)
        assert.deepEqual(readFileSync(join(root, path)), readFileSync(path));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("both coherence entry points enable the public registry only in their local E2E step", () => {
  for (const name of [
    "comun-experience-coherence.yml",
    "comun-quality-performance.yml",
  ]) {
    const workflow = parse(readFileSync(`.github/workflows/${name}`, "utf8"));
    const steps = Object.values(workflow.jobs).flatMap(
      (job) => job.steps || [],
    );
    const run = steps.find((step) =>
      step.run?.includes("npm run test:e2e:experience-coherence"),
    );
    assert.equal(run.env.COMUN_OBSERVATORIES_FOUNDATION_ENABLED, "enabled");
    assert.equal(
      run.env.COMUN_OBSERVATORY_SIDEWALK_ADAPTER_ENABLED,
      "disabled",
    );
    assert.equal(
      workflow.env?.COMUN_OBSERVATORIES_FOUNDATION_ENABLED,
      undefined,
    );
  }
});

test("48.2-A diagnostic remains read-only and does not turn pending or unknown migrations into success", () => {
  assert.equal(
    observatoryStep.env.PGOPTIONS,
    "-c default_transaction_read_only=on",
  );
  assert.match(
    observatoryStep.run,
    /pending.length \|\| unknown.length \|\| observatoryMigrations.length/,
  );
  assert.match(observatoryStep.run, /drift-diagnostic\.json/);
  assert.match(observatoryStep.run, /DIAGNOSTIC_FORMAT_INVALID/);
});

test("portable Node gate preserves sanitized pending, unknown and schema failures", () => {
  const nodeBody = observatoryStep.run.match(
    /node --input-type=module - <<'NODE'\n([\s\S]+?)\nNODE/,
  )[1];
  const childImport = "import { execFileSync } from 'node:child_process';";
  assert.ok(nodeBody.includes(childImport));
  // Only Git discovery is mocked; execute the actual workflow classifier body.
  const code = nodeBody.replace(
    childImport,
    "const execFileSync = () => process.env.TEST_CHANGED || '';",
  );
  for (const scenario of [
    { pending: [], unknown: [], pass: true },
    { pending: ["20261006134804"], unknown: [], pass: false },
    { pending: [], unknown: ["20990101000000"], pass: false },
    { pending: [], unknown: [], badSchema: true, pass: false },
    { pending: [], unknown: [], businessRowsRead: true, pass: false },
    {
      pending: [],
      unknown: [],
      changed: "supabase/migrations/20990101000000_unknown.sql",
      pass: false,
    },
  ]) {
    const root = mkdtempSync(join(tmpdir(), "comun-diagnostic-portable-"));
    try {
      for (const path of [
        manifestPath,
        "scripts/ci/readonly-reconciled-migration-plan.mjs",
      ]) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        cpSync(path, join(root, path));
      }
      const dir = join(root, "comun-48-2-a");
      const artifacts = join(root, ".ci-artifacts/48-2-a-preflight");
      mkdirSync(dir);
      mkdirSync(artifacts, { recursive: true });
      const schema = Object.fromEntries(
        [
          "dbTransportAvailable",
          "psqlReadOnlyAvailable",
          "p4ProjectionPresent",
          "p4ProjectionRlsEnabled",
          "p4PublicGeometryPresent",
          "p6cCApplied",
          "transactionReadOnly",
        ].map((key) => [key, true]),
      );
      schema.businessRowsRead = scenario.businessRowsRead ?? false;
      if (scenario.badSchema) schema.p4ProjectionRlsEnabled = false;
      writeFileSync(join(artifacts, "schema.json"), JSON.stringify(schema));
      writeFileSync(join(dir, "hardening-ledger.json"), JSON.stringify([row]));
      writeFileSync(
        join(dir, "pending-normal-migrations.txt"),
        scenario.pending.join("\n"),
      );
      writeFileSync(
        join(dir, "unknown-remote-migrations.txt"),
        scenario.unknown.join("\n"),
      );
      const result = spawnSync(process.execPath, ["--input-type=module", "-"], {
        cwd: root,
        input: code,
        encoding: "utf8",
        env: {
          ...process.env,
          RUNNER_TEMP: root,
          TEST_CHANGED: scenario.changed || "",
        },
      });
      assert.equal(result.status === 0, scenario.pass, result.stderr);
      const diagnostic = JSON.parse(
        readFileSync(join(artifacts, "drift-diagnostic.json"), "utf8"),
      );
      assert.deepEqual(diagnostic.pendingNormalMigrations, scenario.pending);
      assert.deepEqual(diagnostic.unknownRemoteMigrations, scenario.unknown);
      assert.equal(
        existsSync(join(artifacts, "migration-proof.json")),
        scenario.pass,
      );
      if (!scenario.pass)
        assert.match(result.stderr, /COMUN_48_2_A_BLOCKED_REMOTE_SCHEMA_DRIFT/);
    } finally {
      assert.ok(root.startsWith(join(tmpdir(), "comun-diagnostic-portable-")));
      rmSync(root, { recursive: true, force: true });
    }
  }
});
