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

for (const [prefix, lane] of [
  ...["a1", "c1", "d1", "e2", "e3"].map((lane) => ["48-3", lane]),
  ...["a7", "a1", "a2", "a4", "a5"].map((lane) => ["48-4", lane]),
  ["p6c", "c"],
]) {
  const workflow = parse(
    readFileSync(
      `.github/workflows/comun-${prefix}${prefix === "p6c" ? "" : "-"}${prefix === "p6c" ? "-c" : lane}-preflight.yml`,
      "utf8",
    ),
  );
  const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);
  const plan = steps.find(
    (step) =>
      /^(Prove|Reconcile)/.test(step.name ?? "") &&
      step.run?.includes("readonly-reconciled-migration-plan.mjs"),
  );
  test(`${prefix}-${lane}: promoted plan accepts the exact ledger and blocks drift without changing migrations`, () => {
    assert.ok(plan);
    assert.ok(
      workflow.on.pull_request.paths.includes(
        "scripts/ci/readonly-reconciled-migration-plan*",
      ),
    );
    const root = mkdtempSync(join(tmpdir(), "comun-workflow-plan-"));
    try {
      for (const path of [
        ...migrations,
        manifestPath,
        "scripts/ci/readonly-reconciled-migration-plan.mjs",
        "scripts/ci/readonly-reconciled-migration-plan.node-test.mjs",
      ]) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        cpSync(path, join(root, path));
      }
      const bin = join(root, "bin");
      mkdirSync(bin);
      writeFileSync(
        join(bin, "git"),
        `#!/usr/bin/env node
if(JSON.stringify(process.argv.slice(2))!==JSON.stringify(['diff','--name-only','origin/main...HEAD','--','supabase/migrations'])) process.exit(94);
`,
        { mode: 0o755 },
      );
      const artifact = join(root, `.ci-artifacts/${prefix}-${lane}-preflight`);
      mkdirSync(artifact, { recursive: true });
      writeFileSync(join(artifact, "mode"), "promoted");
      // Stubs enforce the actual child-process contract; no database is contacted.
      writeFileSync(
        join(bin, "psql"),
        `#!/usr/bin/env node
const fs=require('node:fs'); const sql=fs.readFileSync(0,'utf8');
        if(!sql.startsWith('begin read only;') || !sql.includes('public.comun_schema_releases') || !sql.endsWith('rollback;') || process.env.PGOPTIONS!=='-c default_transaction_read_only=on') process.exit(91);
console.log(process.env.TEST_LEDGER);
`,
        { mode: 0o755 },
      );
      writeFileSync(
        join(bin, "supabase"),
        `#!/usr/bin/env node
const fs=require('node:fs');
if(JSON.stringify(process.argv.slice(2))!==JSON.stringify(['db','push','--db-url','postgresql://test.invalid/test','--dry-run'])) process.exit(92);
if(${JSON.stringify(migrations)}.some(p=>fs.existsSync(p))) process.exit(93);
if(process.env.PGOPTIONS!=='-c default_transaction_read_only=on') process.exit(95);
(process.env.TEST_STREAM==='stderr'?console.error:console.log)(process.env.TEST_PLAN);
process.exit(Number(process.env.TEST_EXIT || 0));
`,
        { mode: 0o755 },
      );
      for (const scenario of [
        { ledger: [row], output: "Remote database is up to date.", pass: true },
        {
          ledger: [row],
          output: "Remote database is up to date.",
          stream: "stderr",
          pass: true,
        },
        {
          ledger: [row],
          output: "Remote database is up to date.",
          exit: 7,
          pass: false,
        },
        { ledger: [], output: "Remote database is up to date.", pass: false },
        {
          ledger: [{ ...row, status: "pending" }],
          output: "Remote database is up to date.",
          pass: false,
        },
        {
          ledger: [row],
          output: "Remote database is up to date.\n20990101000000_unknown.sql",
          pass: false,
        },
        {
          ledger: [row],
          output: "Remote database is up to date.\n20990101000000_unknown.sql",
          stream: "stderr",
          pass: false,
        },
        { ledger: [row], output: "", pass: false },
      ]) {
        const result = spawnSync("bash", ["-c", plan.run], {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            SUPABASE_DB_URL: "postgresql://test.invalid/test",
            A1_PREFLIGHT_MODE: "promoted",
            COMUN_MIGRATION_LANE_MODE: "none",
            RUNNER_TEMP: root,
            GITHUB_STEP_SUMMARY: join(root, "summary"),
            TEST_LEDGER: JSON.stringify(scenario.ledger),
            TEST_PLAN: scenario.output,
            TEST_STREAM: scenario.stream ?? "stdout",
            TEST_EXIT: String(scenario.exit ?? 0),
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
}
