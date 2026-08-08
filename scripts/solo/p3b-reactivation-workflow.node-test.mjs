import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/comun-p3b-reactivation.yml", import.meta.url),
  "utf8",
);

test("canonical alias proof uses the deployment-scoped aliases endpoint", () => {
  assert.match(workflow, /\/v13\/deployments\/\$deployment_host\?teamId=/);
  assert.match(workflow, /\/v2\/deployments\/\$deployment_id\/aliases\?teamId=/);
  assert.match(workflow, /entry\?\.alias === "comunsocial\.online"/);
  assert.match(workflow, /COMUN_P3B_CANONICAL_ALIAS_GREEN/);
  assert.match(workflow, /COMUN_P3B_BLOCKED_CANONICAL_ALIAS_STALE/);
  assert.doesNotMatch(workflow, /deployment\.alias/);
});

test("crash recovery requires an allocated non-empty synthetic attempt", () => {
  const recovery = workflow.slice(
    workflow.indexOf("- name: Crash recovery for the exact synthetic attempt"),
    workflow.indexOf("- name: Roll back location after failed activation or smoke"),
  );

  assert.match(recovery, /steps\.attempt\.outcome == 'success'/);
  assert.match(recovery, /steps\.attempt\.outputs\.attempt_id != ''/);
  assert.match(recovery, /steps\.smoke\.outcome != 'success'/);
  assert.match(recovery, /ATTEMPT_ID: \$\{\{ steps\.attempt\.outputs\.attempt_id \}\}/);
});
