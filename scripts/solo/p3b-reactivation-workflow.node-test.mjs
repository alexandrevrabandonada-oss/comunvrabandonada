import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  new URL("../../.github/workflows/comun-p3b-reactivation.yml", import.meta.url),
  "utf8",
);
const productionSmoke = fs.readFileSync(
  new URL("./rehearse-p3b-private-location-production.mjs", import.meta.url),
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

test("canonical alias shell step is syntactically valid", () => {
  const stepMarker = "      - name: Verify canonical alias points to the new deployment";
  const stepStart = workflow.indexOf(stepMarker);
  const runStart = workflow.indexOf("        run: |\n", stepStart) + "        run: |\n".length;
  const runEnd = workflow.indexOf("\n\n      - name:", runStart);
  assert.ok(stepStart >= 0 && runStart >= 0 && runEnd > runStart);

  const shell = workflow
    .slice(runStart, runEnd)
    .split("\n")
    .map((line) => line.startsWith("          ") ? line.slice(10) : line)
    .join("\n");
  const syntax = spawnSync("bash", ["-n"], { input: shell, encoding: "utf8" });
  assert.equal(syntax.status, 0, syntax.stderr);
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

test("production smoke qualifies location withdrawal metadata across joins", () => {
  assert.match(productionSmoke, /l\.withdrawn_at as location_withdrawn_at/);
  assert.match(productionSmoke, /firstMetadata\.location_withdrawn_at/);
  assert.match(productionSmoke, /secondMetadata\.location_withdrawn_at/);
  assert.doesNotMatch(
    productionSmoke,
    /select encrypted_value, nonce, auth_tag, origin, accuracy_class, captured_at, evidence_state, withdrawn_at from/,
  );
});
