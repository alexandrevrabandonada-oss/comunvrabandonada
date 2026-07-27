import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(
  ".github/workflows/comun-sidewalk-activate.yml",
);

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
