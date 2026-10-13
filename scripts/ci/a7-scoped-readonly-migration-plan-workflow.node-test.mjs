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
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const manifestPath =
  "supabase/releases/20260922120000-canonical-security-hardening-v2.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const held = [
  manifest.migration,
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
];
const learningPath = "supabase/migrations/20261006134804_comun_learning_r0.sql";
const learningManifestPath =
  "supabase/releases/20261006134804-comun-learning-r0.json";
const validatorPath = "scripts/ci/a7-scoped-readonly-migration-plan.mjs";
const row = {
  release: manifest.release,
  migration_path: manifest.migration,
  migration_sha256: manifest.migrationSha256,
  pre_fingerprint: manifest.expectedPreFingerprint,
  post_fingerprint: manifest.expectedPostFingerprint,
  status: "applied",
};
const learningPlan =
  "DRY RUN: migrations will *not* be pushed to the database.\n" +
  "Would push these migrations:\n20261006134804_comun_learning_r0.sql";
// The A7 runner intentionally installs no npm packages. Extract only its
// known, indented literal Bash block and fail if that contract changes.
const source = readFileSync(
  ".github/workflows/comun-48-4-a7-preflight.yml",
  "utf8",
);
const stepStart = source.indexOf(
  "      - name: Prove A7-scoped remote migration plan\n",
);
assert.ok(stepStart >= 0);
const stepEnd = source.indexOf("\n      - ", stepStart + 1);
assert.ok(stepEnd > stepStart);
const block = source.slice(stepStart, stepEnd);
const runMarker = "        run: |\n";
const runStart = block.indexOf(runMarker);
assert.ok(runStart >= 0);
const step = {
  run: block
    .slice(runStart + runMarker.length)
    .split("\n")
    .map((line) => {
      if (!line) return "";
      assert.ok(line.startsWith("          "));
      return line.slice(10);
    })
    .join("\n"),
};
assert.ok(
  source.includes('      - "scripts/ci/a7-scoped-readonly-migration-plan*"'),
);

const scenarios = [
  { name: "empty stdout", output: "Remote database is up to date.", pass: true },
  {
    name: "empty stderr",
    output: "Remote database is up to date.",
    stream: "stderr",
    pass: true,
  },
  { name: "canonical School stdout", output: learningPlan, pass: true },
  {
    name: "canonical School stderr",
    output: learningPlan,
    stream: "stderr",
    pass: true,
  },
  { name: "failed CLI", output: learningPlan, exit: 7, pass: false },
  { name: "missing ledger", output: learningPlan, ledger: [], pass: false },
  {
    name: "ledger drift",
    output: learningPlan,
    ledger: [{ ...row, status: "pending" }],
    pass: false,
  },
  {
    name: "unknown migration",
    output: "20990101000000_unknown.sql",
    pass: false,
  },
  {
    name: "additional migration",
    output: learningPlan + "\n20990101000000_unknown.sql",
    pass: false,
  },
  {
    name: "duplicate School",
    output: learningPlan + "\n20261006134804_comun_learning_r0.sql",
    pass: false,
  },
  {
    name: "missing dry-run markers",
    output: "20261006134804_comun_learning_r0.sql",
    pass: false,
  },
  {
    name: "forbidden operation",
    output: learningPlan + "\n--include-all",
    pass: false,
  },
  { name: "School bytes drift", output: learningPlan, drift: learningPath, pass: false },
  {
    name: "manifest bytes drift",
    output: learningPlan,
    drift: learningManifestPath,
    pass: false,
  },
  { name: "missing scoped validator", output: learningPlan, missingValidator: true, pass: false },
];

for (const scenario of scenarios) {
  test(`A7 actual workflow: ${scenario.name}`, () => {
    const root = mkdtempSync(join(tmpdir(), "comun-a7-scoped-plan-"));
    const files = [
      ...held,
      manifestPath,
      learningPath,
      learningManifestPath,
      "scripts/ci/classify-migration-lane.mjs",
      "scripts/ci/readonly-reconciled-migration-plan.mjs",
      "scripts/ci/readonly-reconciled-migration-plan.node-test.mjs",
      ...(scenario.missingValidator ? [] : [validatorPath]),
    ];
    try {
      for (const path of files) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        cpSync(path, join(root, path));
      }
      if (scenario.drift)
        writeFileSync(
          join(root, scenario.drift),
          readFileSync(join(root, scenario.drift), "utf8") + "\nDRIFT",
        );
      const expectedBytes = [...held, learningPath, learningManifestPath].map(
        (path) => [path, readFileSync(join(root, path))],
      );
      const bin = join(root, "bin");
      mkdirSync(bin);
      writeFileSync(
        join(bin, "psql"),
        `#!/usr/bin/env node
const fs=require('node:fs');const sql=fs.readFileSync(0,'utf8');
if(!sql.startsWith('begin read only;') || !sql.includes('public.comun_schema_releases') || !sql.endsWith('rollback;') || process.env.PGOPTIONS!=='-c default_transaction_read_only=on') process.exit(91);
console.log(process.env.TEST_LEDGER);
`,
        { mode: 0o755 },
      );
      writeFileSync(
        join(bin, "supabase"),
        `#!/usr/bin/env node
const fs=require('node:fs');
if(JSON.stringify(process.argv.slice(2))!==JSON.stringify(['db','push','--db-url','postgresql://test.invalid/test','--dry-run']))process.exit(92);
if(${JSON.stringify(held)}.some(p=>fs.existsSync(p)))process.exit(93);
if(!fs.existsSync(${JSON.stringify(learningPath)}) || process.env.PGOPTIONS!=='-c default_transaction_read_only=on')process.exit(94);
(process.env.TEST_STREAM==='stderr'?console.error:console.log)(process.env.TEST_PLAN);
process.exit(Number(process.env.TEST_EXIT||0));
`,
        { mode: 0o755 },
      );
      mkdirSync(join(root, ".ci-artifacts/48-4-a7-preflight"), { recursive: true });
      const summary = join(root, "summary");
      const result = spawnSync("bash", ["-c", step.run], {
        cwd: root,
        encoding: "utf8",
        timeout: 15000,
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          SUPABASE_DB_URL: "postgresql://test.invalid/test",
          GITHUB_STEP_SUMMARY: summary,
          TEST_LEDGER: JSON.stringify(scenario.ledger ?? [row]),
          TEST_PLAN: scenario.output,
          TEST_STREAM: scenario.stream ?? "stdout",
          TEST_EXIT: String(scenario.exit ?? 0),
        },
      });
      assert.equal(result.status === 0, scenario.pass, result.stderr);
      for (const [path, bytes] of expectedBytes)
        assert.deepEqual(readFileSync(join(root, path)), bytes);
      if (scenario.pass) {
        const text = readFileSync(summary, "utf8");
        assert.match(text, /a7OwnedPendingMigrations=0/);
        assert.match(text, /businessContentRead=false/);
        assert.doesNotMatch(text, /migrationCount=0/);
        if (scenario.output === learningPlan) {
          assert.match(text, /remoteMigrationPlan=one-unrelated-learning-r0-pending/);
          assert.match(
            text,
            /unrelatedPendingMigration=20261006134804_comun_learning_r0\.sql/,
          );
          assert.doesNotMatch(text, /remotePendingMigrationCount=0/);
        } else {
          assert.match(text, /remoteMigrationPlan=empty/);
          assert.match(text, /remotePendingMigrationCount=0/);
          assert.doesNotMatch(text, /unrelatedPendingMigration=/);
        }
      } else {
        assert.equal(existsSync(summary), false);
        assert.equal(
          existsSync(join(root, ".ci-artifacts/48-4-a7-preflight/plan.txt")),
          false,
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
