import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/comun-p3b-reactivation.yml", import.meta.url),
  "utf8",
);

test("canonical alias proof resolves nullable deploymentId through deployment.id", () => {
  assert.match(workflow, /deploy --prod --skip-domain --yes/);
  assert.match(workflow, /promote "\$DEPLOYMENT_URL" --yes --timeout=5m/);
  assert.match(workflow, /alias set "\$DEPLOYMENT_URL" comunsocial\.online/);
  assert.match(workflow, /\/v13\/deployments\/\$deployment_host\?teamId=/);
  assert.match(workflow, /deployment\.projectId \|\| deployment\.project\?\.id/);
  assert.match(workflow, /deploymentProjectId !== process\.env\.VERCEL_PROJECT_ID/);
  assert.match(workflow, /typeof deployment\.id !== "string"/);
  assert.match(workflow, /\^dpl_\[A-Za-z0-9\]\{8,128\}/);
  assert.match(workflow, /process\.stdout\.write\(deployment\.id\)/);
  assert.doesNotMatch(workflow, /deployment\.uid/);
  assert.match(workflow, /\/v4\/aliases\/comunsocial\.online\?teamId=/);
  assert.match(workflow, /alias\.deploymentId \|\| alias\.deployment\?\.id/);
  assert.match(workflow, /normalize\(resolvedDeploymentId\) === normalize\(process\.env\.EXPECTED_DEPLOYMENT_ID\)/);
  assert.match(workflow, /COMUN_P3B_CANONICAL_ALIAS_GREEN/);
  assert.match(workflow, /COMUN_P3B_CANONICAL_ALIAS_SANITIZED_DIAGNOSTIC/);
  assert.match(workflow, /topLevelDeploymentIdPresent/);
  assert.match(workflow, /nestedDeploymentIdPresent/);
  assert.match(workflow, /topLevelDeploymentExact/);
  assert.match(workflow, /nestedDeploymentExact/);
  assert.match(workflow, /redirectPresent/);
  assert.match(workflow, /COMUN_P3B_BLOCKED_CANONICAL_ALIAS_STALE/);
  assert.doesNotMatch(workflow, /deployment\.alias/);
  assert.doesNotMatch(workflow, /\/v2\/deployments\/\$deployment_id\/aliases/);
  assert.doesNotMatch(workflow, /\/v13\/deployments\/comunsocial\.online/);
});

test("automatic rollback explicitly promotes the flags-off deployment", () => {
  const rollback = workflow.slice(
    workflow.indexOf("- name: Roll back location after failed activation or smoke"),
    workflow.indexOf("- name: Upload sanitized Production evidence"),
  );

  assert.match(rollback, /env update COMUN_RELATA_LOCATION_ENABLED production/);
  assert.match(rollback, /deploy --prod --skip-domain --yes/);
  assert.match(rollback, /promote "\$rollback_url" --yes --timeout=5m/);
  assert.match(rollback, /alias set "\$rollback_url" comunsocial\.online/);
  assert.match(rollback, /COMUN_P3B_LOCATION_ROLLED_BACK_AFTER_FAILED_SMOKE/);
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
