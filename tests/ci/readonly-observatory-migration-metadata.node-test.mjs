import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import {
  readFileSync,
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
