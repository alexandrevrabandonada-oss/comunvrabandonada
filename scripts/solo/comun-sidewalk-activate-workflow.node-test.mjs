import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(
  ".github/workflows/comun-sidewalk-activate.yml",
);
const ciWorkflowPath = path.resolve(".github/workflows/comun-ci.yml");

test("sidewalk activation workflow keeps a read-only preflight and an exact activation interlock", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /options: \[preflight, activate\]/);
  assert.match(
    workflow,
    /node scripts\/solo\/apply-forward-only\.mjs --read-only-preflight/,
  );
  assert.match(workflow, /COMUN_CALCADAS_REMOTE_READONLY_PREFLIGHT_GREEN/);
  assert.match(workflow, /if: inputs\.mode == 'activate'/);
  assert.match(workflow, /AUTORIZO_CALCADAS_20260724233256/);
  assert.match(
    workflow,
    /git merge-base --is-ancestor "\$EXPECTED_MAIN_SHA" refs\/remotes\/origin\/main/,
  );
  assert.match(workflow, /node scripts\/solo\/apply-forward-only\.mjs\n/);
  assert.match(workflow, /COMUN_SIDEWALK_OPERATIONAL_V2 production --force/);
  assert.match(workflow, /printf '%s' disabled/);
});

test("sidewalk readiness restores a historical local baseline before applying the canonical release", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");
  const checkpoint =
    workflow.match(
      /  sidewalk-readiness-checkpoint:[\s\S]*?\n  sidewalk-readiness-full:/,
    )?.[0] ?? "";

  assert.match(checkpoint, /Reset the historical pre-release local baseline/);
  assert.match(checkpoint, /held_migrations="\$\(mktemp -d\)"/);
  assert.match(checkpoint, /trap restore_migrations EXIT/);
  assert.match(
    checkpoint,
    /20260724233256_comun_sidewalk_operational_hardening\.sql/,
  );
  assert.match(
    checkpoint,
    /node scripts\/comun-local-env\.mjs run node scripts\/solo\/apply-forward-only\.mjs/,
  );
  assert.doesNotMatch(checkpoint, /supabase db push|migration repair/i);
});

test("sidewalk readiness re-runs its labeled checkpoint on synchronize and reports exact Central states", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");

  assert.match(
    workflow,
    /contains\(fromJSON\('\["labeled","synchronize"\]'\), github\.event\.action\)/,
  );
  assert.match(workflow, /central-after-sidewalk-checkpoint/);
  assert.match(workflow, /central-after-sidewalk-release/);
  assert.match(
    workflow,
    /COMUN_CENTRAL_CAUSE: \$\{\{ needs\.sidewalk-readiness-checkpoint\.result == 'failure'/,
  );
});
