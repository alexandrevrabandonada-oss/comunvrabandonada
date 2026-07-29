import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const workflowPath = path.resolve(
  ".github/workflows/comun-sidewalk-activate.yml",
);
const ciWorkflowPath = path.resolve(".github/workflows/comun-ci.yml");

function job(workflow, name, next) {
  return (
    workflow.match(new RegExp(`  ${name}:[\\s\\S]*?\\n  ${next}:`, "m"))?.[0] ??
    ""
  );
}

function validateFakeVercelProjectResponse(raw) {
  try {
    const project = JSON.parse(raw);
    const matches = {
      projectId: project.id === "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
      account: project.accountId === "team_LBVwyK8FQMO7tA3hzVXXeumF",
      name: project.name === "comunvrabandonada",
    };

    return Object.values(matches).every(Boolean)
      ? "COMUN_VERCEL_PREFLIGHT http_status=200 project_id_match=true account_match=true project_name_match=true"
      : "COMUN_TIJOLO_45_3G_VERCEL_CONFIGURATION_MISMATCH";
  } catch {
    return "COMUN_VERCEL_PREFLIGHT_RESPONSE_INVALID";
  }
}

test("sidewalk workflow separates read-only preflight, migration, and activation", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const preflight = job(workflow, "preflight", "migrate");
  const migrate = job(workflow, "migrate", "postflight");
  const postflight = job(workflow, "postflight", "activate");
  const activate = job(
    workflow,
    "activate",
    "configure-operational-database-url",
  );

  assert.match(
    workflow,
    /options:\s*\[\s*preflight,\s*vercel-preflight,\s*operational-env-preflight,\s*protected-deployment-preflight,\s*protected-operational-diagnostic,\s*configure-operational-database-url,\s*migrate,\s*activate,?\s*\]/,
  );
  assert.match(workflow, /contract_id:/);
  assert.match(workflow, /sidewalk-operational-safer-pre-v2/);
  assert.match(
    workflow,
    /git merge-base --is-ancestor "\$EXPECTED_MAIN_SHA" refs\/remotes\/origin\/main/,
  );
  assert.match(
    preflight,
    /node scripts\/solo\/apply-forward-only\.mjs --read-only-preflight/,
  );
  assert.match(preflight, /COMUN_CANONICAL_RELEASE_LEDGER_STATE ABSENT/);
  assert.match(preflight, /COMUN_CALCADAS_REMOTE_READONLY_PREFLIGHT_GREEN/);
  assert.match(preflight, /assert-sanitized-security-diagnostic/);
  assert.doesNotMatch(
    preflight,
    /VERCEL_TOKEN|vercel@|apply-forward-only\.mjs\n/,
  );

  assert.match(migrate, /needs: \[validate-input, preflight\]/);
  assert.match(migrate, /AUTORIZO_MIGRATION_CALCADAS_/);
  assert.match(migrate, /MANTER_FLAG_DESABILITADA/);
  assert.match(migrate, /node scripts\/solo\/apply-forward-only\.mjs\n/);
  assert.match(migrate, /--read-only-postflight/);
  assert.doesNotMatch(
    migrate,
    /VERCEL_TOKEN|vercel@|COMUN_SIDEWALK_OPERATIONAL_V2 production/,
  );

  assert.match(postflight, /--read-only-postflight/);
  assert.doesNotMatch(postflight, /apply-forward-only\.mjs\n/);
  assert.match(activate, /AUTORIZO_ATIVAR_CALCADAS_/);
  assert.match(activate, /COMUN_SIDEWALK_OPERATIONAL_V2 production --force/);
  assert.doesNotMatch(
    activate,
    /node scripts\/solo\/apply-forward-only\.mjs\n/,
  );
  assert.match(
    activate,
    /monitor-production\.mjs --minutes=2 --domain=comunvrabandonada\.vercel\.app --deployment-url="\$DEPLOYMENT_URL"[\s\S]*--activation/,
  );
  assert.notEqual(
    workflow.indexOf("AUTORIZO_MIGRATION_CALCADAS_"),
    workflow.indexOf("AUTORIZO_ATIVAR_CALCADAS_"),
  );
});

test("activation captures one protected deployment URL, waits for readiness, and rolls back through the same states", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const activate = job(
    workflow,
    "activate",
    "configure-operational-database-url",
  );

  assert.match(activate, /umask 077/);
  assert.match(activate, /CAPTURE_FILE="\$\(mktemp\)"/);
  assert.match(activate, /chmod 600 "\$CAPTURE_FILE"/);
  assert.match(activate, /trap cleanup EXIT/);
  assert.match(activate, /\>"\$output" 2>"\$error"/);
  assert.match(
    activate,
    /DEPLOYMENT_STDOUT="\$output" node --input-type=module/,
  );
  assert.match(activate, /https:\\\/\\\/comunvrabandonada/);
  assert.match(
    activate,
    /filter\(\(candidate\) => new URL\(candidate\)\.hostname !== "comunvrabandonada\.vercel\.app"\)/,
  );
  assert.match(activate, /SOLO_ACTIVATION_DEPLOYMENT_CREATED/);
  assert.match(activate, /timeout 300s npx --yes vercel@50\.28\.0 inspect/);
  assert.match(activate, /vercel@50\.28\.0 inspect "\$DEPLOYMENT_URL" --wait/);
  assert.match(activate, /SOLO_ACTIVATION_DEPLOYMENT_READY/);
  assert.match(
    activate,
    /--readiness-minutes=5 --poll-seconds=10 --require-consecutive=2 --activation/,
  );
  assert.match(activate, /SOLO_ACTIVATION_DEPLOYMENT_FLAG_VISIBLE/);
  assert.match(activate, /SOLO_ACTIVATION_CANONICAL_ALIAS_READY/);
  assert.match(activate, /SOLO_ACTIVATION_FUNCTIONAL_SMOKE_GREEN/);
  assert.match(activate, /SOLO_ACTIVATION_MONITOR_GREEN/);
  assert.match(activate, /ROLLBACK_FLAG_DISABLED/);
  assert.match(activate, /ROLLBACK_DEPLOYMENT_CREATED/);
  assert.match(activate, /--rollback-readiness/);
  assert.match(activate, /ROLLBACK_ALIAS_PAUSED/);
  assert.match(activate, /ROLLBACK_GREEN/);
  assert.match(activate, /Emit one sanitized terminal activation result/);
  assert.doesNotMatch(activate, /\btee\b|\bcat\b|set -x/);
  assert.doesNotMatch(
    activate,
    /(?:echo|printf)\s+[^|\n]*"\$(?:VERCEL_TOKEN|VERCEL_ORG_ID|VERCEL_PROJECT_ID)"/,
  );

  assert.ok(
    activate.indexOf(
      "capture_deployment activation && inspect_deployment activation && run_activation_monitor",
    ) > activate.indexOf('inspect "$DEPLOYMENT_URL" --wait'),
  );
  assert.ok(
    activate.indexOf(
      "capture_deployment activation && inspect_deployment activation && run_activation_monitor",
    ) < activate.indexOf("state ACTIVATION_GREEN"),
  );
  assert.ok(
    activate.indexOf("if ! run_rollback_readiness; then") >
      activate.indexOf("if ! inspect_deployment rollback; then"),
  );
});

test("Vercel credential preflight is fixed, read-only, and cannot activate", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const vercelPreflight = job(
    workflow,
    "vercel-preflight",
    "protected-deployment-preflight",
  );

  assert.match(vercelPreflight, /if: inputs\.mode == 'vercel-preflight'/);
  assert.match(vercelPreflight, /needs: validate-input/);
  assert.match(
    vercelPreflight,
    /\[\[ -n "\$VERCEL_TOKEN" \]\] && token_present=true/,
  );
  assert.match(vercelPreflight, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(vercelPreflight, /prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X/);
  assert.match(
    vercelPreflight,
    /https:\/\/api\.vercel\.com\/v9\/projects\/\$\{VERCEL_PROJECT_ID\}\?teamId=\$\{VERCEL_ORG_ID\}/,
  );
  assert.match(vercelPreflight, /COMUN_VERCEL_PROTECTED_ACCESS_READ_GREEN/);
  assert.match(
    vercelPreflight,
    /COMUN_TIJOLO_45_3G_VERCEL_CONFIGURATION_MISMATCH/,
  );
  assert.match(
    vercelPreflight,
    /COMUN_TIJOLO_45_3G_VERCEL_ACCESS_STILL_BLOCKED/,
  );
  assert.match(vercelPreflight, /umask 077/);
  assert.match(vercelPreflight, /project_json="\$\(mktemp\)"/);
  assert.match(vercelPreflight, /curl_error="\$\(mktemp\)"/);
  assert.match(vercelPreflight, /chmod 600 "\$project_json" "\$curl_error"/);
  assert.match(
    vercelPreflight,
    /trap 'rm -f "\$project_json" "\$curl_error"' EXIT/,
  );
  assert.match(vercelPreflight, /set \+e/);
  assert.match(vercelPreflight, /curl_exit=\$\?/);
  assert.match(vercelPreflight, /COMUN_VERCEL_PREFLIGHT_TRANSPORT_FAILED/);
  assert.ok(
    vercelPreflight.indexOf('if [[ "$status" != "200" ]]') <
      vercelPreflight.indexOf('PROJECT_JSON="$project_json" node'),
  );
  assert.doesNotMatch(
    vercelPreflight,
    /node --input-type=module -- "\$project_json"/,
  );
  assert.match(
    vercelPreflight,
    /PROJECT_JSON="\$project_json" node --input-type=module <</,
  );
  assert.match(vercelPreflight, /process\.env\.PROJECT_JSON/);
  assert.match(vercelPreflight, /COMUN_VERCEL_PREFLIGHT_RESPONSE_PATH_MISSING/);
  assert.match(vercelPreflight, /COMUN_VERCEL_PREFLIGHT_RESPONSE_INVALID/);
  assert.doesNotMatch(vercelPreflight, /cat\b|tee\b|set -x/);
  assert.doesNotMatch(
    vercelPreflight,
    /console\.log\(project|console\.error\(project/,
  );
  assert.doesNotMatch(
    vercelPreflight,
    /vercel@|env add|--prod|COMUN_SIDEWALK_OPERATIONAL_V2|apply-forward-only\.mjs/,
  );
  assert.doesNotMatch(vercelPreflight, /-X\s*(?:POST|PUT|PATCH|DELETE)/i);
});

test("protected deployment preflight reads one allowlisted rollback deployment without changing Vercel", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const protectedPreflight = job(
    workflow,
    "protected-deployment-preflight",
    "preflight",
  );

  assert.match(
    protectedPreflight,
    /if: inputs\.mode == 'protected-deployment-preflight'/,
  );
  assert.match(protectedPreflight, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(protectedPreflight, /target=production&state=READY&limit=20/);
  assert.match(
    protectedPreflight,
    /deployment\?\.meta\?\.githubCommitSha === process\.env\.EXPECTED_MAIN_SHA/,
  );
  assert.match(
    protectedPreflight,
    /node scripts\/solo\/probe-protected-vercel-deployment\.mjs/,
  );
  assert.match(protectedPreflight, /--expected-state=paused/);
  assert.match(
    protectedPreflight,
    /COMUN_PROTECTED_DEPLOYMENT_READONLY_PREFLIGHT_GREEN/,
  );
  assert.match(protectedPreflight, /umask 077/);
  assert.match(protectedPreflight, /mktemp/);
  assert.match(protectedPreflight, /chmod 600/);
  assert.match(protectedPreflight, /trap 'rm -f/);
  assert.doesNotMatch(
    protectedPreflight,
    /env add|--prod|COMUN_SIDEWALK_OPERATIONAL_V2|apply-forward-only\.mjs/,
  );
  assert.doesNotMatch(protectedPreflight, /-X\s*(?:POST|PUT|PATCH|DELETE)/i);
});

test("operational environment preflight uses the fixed v10 read-only helper and always uploads access evidence", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const environmentPreflight = job(
    workflow,
    "operational-env-preflight",
    "protected-operational-diagnostic",
  );

  assert.match(
    environmentPreflight,
    /if: inputs\.mode == 'operational-env-preflight'/,
  );
  assert.match(environmentPreflight, /needs: validate-input/);
  assert.match(
    environmentPreflight,
    /node scripts\/solo\/fetch-vercel-operational-env-metadata\.mjs/,
  );
  assert.match(environmentPreflight, /classification\.json/);
  assert.match(
    environmentPreflight,
    /path: \.ci-artifacts\/sidewalk-operational-env\//,
  );
  assert.match(
    environmentPreflight,
    /COMUN_SIDEWALK_OPERATIONAL_ENV_PREFLIGHT_GREEN/,
  );
  assert.match(
    environmentPreflight,
    /comun-sidewalk-operational-env-inventory-\$\{\{ inputs\.expected_main_sha \}\}-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    environmentPreflight,
    /env pull|env add|env rm|--prod|COMUN_SIDEWALK_OPERATIONAL_V2 production|value=|\/v9\/projects\/\$\{VERCEL_PROJECT_ID\}\/env/i,
  );
  assert.doesNotMatch(environmentPreflight, /-X\s*(?:POST|PUT|PATCH|DELETE)/i);
});

test("protected operational diagnostic uses the immutable deployment and emits only sanitized evidence", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const diagnostic = job(
    workflow,
    "protected-operational-diagnostic",
    "protected-deployment-preflight",
  );

  assert.match(
    diagnostic,
    /if: inputs\.mode == 'protected-operational-diagnostic'/,
  );
  assert.match(
    diagnostic,
    /node scripts\/solo\/fetch-vercel-operational-env-metadata\.mjs/,
  );
  assert.doesNotMatch(
    diagnostic,
    /\/v9\/projects\/\$\{VERCEL_PROJECT_ID\}\/env/,
  );
  assert.match(diagnostic, /target=production&state=READY&limit=20/);
  assert.match(
    diagnostic,
    /node scripts\/solo\/probe-protected-vercel-deployment\.mjs[\s\S]*?--operational-diagnostic/,
  );
  assert.match(diagnostic, /classify-sidewalk-operational-gate\.mjs/);
  assert.match(diagnostic, /PROTECTED_OPERATIONAL_DIAGNOSTIC_GREEN/);
  assert.match(
    diagnostic,
    /comun-sidewalk-protected-operational-diagnostic-\$\{\{ inputs\.expected_main_sha \}\}-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    diagnostic,
    /env pull|env add|env rm|--prod|COMUN_SIDEWALK_OPERATIONAL_V2 production|apply-forward-only\.mjs/i,
  );
  assert.doesNotMatch(diagnostic, /-X\s*(?:POST|PUT|PATCH|DELETE)/i);
});

test("Vercel preflight fixtures emit only sanitized matches or parser markers", () => {
  const validFixture = JSON.stringify({
    id: "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
    accountId: "team_LBVwyK8FQMO7tA3hzVXXeumF",
    name: "comunvrabandonada",
    ignoredSensitiveFixtureField: "never-logged",
  });

  assert.equal(
    validateFakeVercelProjectResponse(validFixture),
    "COMUN_VERCEL_PREFLIGHT http_status=200 project_id_match=true account_match=true project_name_match=true",
  );
  assert.equal(
    validateFakeVercelProjectResponse("not-json"),
    "COMUN_VERCEL_PREFLIGHT_RESPONSE_INVALID",
  );
  assert.equal(
    validateFakeVercelProjectResponse(JSON.stringify({ id: "wrong" })),
    "COMUN_TIJOLO_45_3G_VERCEL_CONFIGURATION_MISMATCH",
  );
});

test("workflow accepts no SQL or path input and uses only the fixed scoped contract", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  assert.doesNotMatch(
    workflow,
    /sql_input|migration_path|release_manifest_path/i,
  );
  assert.match(
    workflow,
    /20260724233256-comun-sidewalk-operational-hardening-safer-pre-v2\.json/,
  );
  assert.doesNotMatch(workflow, /COMUN_RELEASE_MANIFEST:\s*\$\{\{ inputs/i);
  assert.match(workflow, /expected_main_sha:/);
});

test("activation binds authorization and concurrency to a single attempt and always emits a sanitized terminal artifact", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const activate = job(
    workflow,
    "activate",
    "configure-operational-database-url",
  );

  assert.match(workflow, /activation_attempt_id:/);
  assert.match(
    workflow,
    /comun-sidewalk-operational-\$\{\{ inputs\.mode \}\}-\$\{\{ inputs\.expected_main_sha \}\}-\$\{\{ inputs\.activation_attempt_id \}\}-\$\{\{ inputs\.configuration_attempt_id \}\}/,
  );
  assert.match(activate, /\^sidewalk-activate-\[0-9\]\{8\}-\[0-9\]\{2\}\$/);
  assert.match(
    activate,
    /AUTORIZO_ATIVAR_CALCADAS_\$\{PROJECT_REF\}_\$\{EXPECTED_MAIN_SHA\}_\$\{LEDGER_HASH\}_\$\{ACTIVATION_ATTEMPT_ID\}/,
  );
  assert.match(activate, /SOLO_ACTIVATION_AUTHORIZATION_INVALID/);
  assert.match(
    activate,
    /Confirm a failed activation returned to paused public state/,
  );
  assert.match(activate, /if: failure\(\)/);
  assert.match(activate, /FINAL_PUBLIC_PAUSED/);
  assert.match(activate, /FINAL_PUBLIC_UNSAFE/);
  assert.match(activate, /Emit one sanitized terminal activation result/);
  assert.match(activate, /if: always\(\)/);
  assert.match(activate, /activation-result\.mjs/);
  assert.match(activate, /path: \.ci-artifacts\/sidewalk-activation\/result/);
  assert.match(
    activate,
    /comun-sidewalk-activation-\$\{\{ inputs\.expected_main_sha \}\}-\$\{\{ inputs\.activation_attempt_id \}\}-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(activate, /--retry|retry_count|retry-delay/i);
});

test("database URL configuration is a fixed, separately authorized gate with limited rollback", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const configurationResult = await readFile(
    path.resolve("scripts/solo/database-env-configuration-result.mjs"),
    "utf8",
  );
  const configuration =
    workflow.match(/  configure-operational-database-url:[\s\S]*$/)?.[0] ?? "";

  assert.match(
    configuration,
    /if: inputs\.mode == 'configure-operational-database-url'/,
  );
  assert.match(configuration, /needs: validate-input/);
  assert.match(workflow, /configuration_attempt_id:/);
  assert.match(configuration, /\^sidewalk-db-env-\[0-9\]\{8\}-\[0-9\]\{2\}\$/);
  assert.match(
    configuration,
    /AUTORIZO_CONFIGURAR_CALCADAS_DATABASE_URL_\$\{VERCEL_PROJECT_ID\}_\$\{EXPECTED_MAIN_SHA\}_\$\{LEDGER_HASH\}_\$\{CONFIGURATION_ATTEMPT_ID\}_MANTER_FLAG_DESABILITADA/,
  );
  assert.match(
    configuration,
    /PR23_DATABASE_URL="\$SUPABASE_DB_URL"[\s\S]*?apply-forward-only\.mjs --read-only-postflight/,
  );
  assert.match(
    configuration,
    /COMUN_SIDEWALK_DATABASE_ENV_ALREADY_PRESENT_REVIEW_REQUIRED/,
  );
  assert.match(
    configuration,
    /printf '%s' "\$SUPABASE_DB_URL" \| npx --yes vercel@50\.28\.0 env add COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL production --sensitive/,
  );
  assert.match(
    configuration,
    /env rm COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL production --yes/,
  );
  assert.match(
    configurationResult,
    /COMUN_SIDEWALK_DATABASE_ENV_CONFIGURED_RUNTIME_GREEN_FLAG_DISABLED/,
  );
  assert.match(
    configurationResult,
    /COMUN_SIDEWALK_DATABASE_ENV_CONFIGURATION_FAILED_ROLLED_BACK/,
  );
  assert.match(
    configurationResult,
    /COMUN_SIDEWALK_DATABASE_ENV_CONFIGURATION_FAILED_ROLLBACK_INCOMPLETE/,
  );
  assert.match(configurationResult, /configuration-result\.json/);
  assert.match(configuration, /if: always\(\)/);
  assert.match(
    configuration,
    /comun-sidewalk-database-env-configuration-\$\{\{ inputs\.expected_main_sha \}\}-\$\{\{ inputs\.configuration_attempt_id \}\}-\$\{\{ github\.run_id \}\}/,
  );
  assert.doesNotMatch(
    configuration,
    /COMUN_SIDEWALK_OPERATIONAL_V2 production/,
  );
  assert.doesNotMatch(configuration, /apply-forward-only\.mjs\n/);
  assert.doesNotMatch(configuration, /set -x|env pull|--debug/i);
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
  assert.match(
    checkpoint,
    /Apply and reapply the local release[\s\S]*?Restore the current local schema for RLS and E2E[\s\S]*?supabase db reset --local --yes[\s\S]*?Adopt the exact local release ledger for E2E[\s\S]*?--adopt-local-validation-ledger[\s\S]*?npm run audit:rls-matrix/,
  );
  assert.match(
    checkpoint,
    /Restore the current local schema for RLS and E2E[\s\S]*?reset_output="\$\(mktemp\)"[\s\S]*?grep -q "Error status 502" "\$reset_output"[\s\S]*?COMUN_SIDEWALK_LOCAL_RESET_502_SINGLE_RETRY/,
  );
  assert.doesNotMatch(checkpoint, /printf ['\"]?%s.*reset_output/);
  assert.match(checkpoint, /Upload sidewalk readiness E2E evidence/);
  assert.match(
    checkpoint,
    /comun-sidewalk-readiness-e2e-\$\{\{ github\.sha \}\}/,
  );
  assert.match(checkpoint, /test-results\/evidence/);
  assert.doesNotMatch(checkpoint, /supabase db push|migration repair/i);
});

test("sidewalk readiness runs CHECKPOINT only for its own label or a new SHA", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");
  const checkpoint =
    workflow.match(
      /  sidewalk-readiness-checkpoint:[\s\S]*?\n  sidewalk-readiness-full:/,
    )?.[0] ?? "";

  assert.match(
    workflow,
    /contains\(fromJSON\('\["opened","synchronize","reopened","ready_for_review","labeled"\]'\), github\.event\.action\)/,
  );
  assert.match(
    checkpoint,
    /github\.event\.action == 'synchronize' \|\| \(github\.event\.action == 'labeled' && github\.event\.label\.name == 'comun:checkpoint'\)/,
  );
  assert.doesNotMatch(checkpoint, /comun:release-candidate/);
  assert.match(checkpoint, /commits\/\$SHA\/check-runs/);
  assert.match(workflow, /central-after-sidewalk-checkpoint/);
  assert.match(workflow, /central-after-sidewalk-release/);
  assert.match(
    workflow,
    /COMUN_CENTRAL_CAUSE: \$\{\{ needs\.sidewalk-readiness-checkpoint\.result == 'failure'/,
  );
});

test("sidewalk readiness FULL reuses only a green CHECKPOINT for the exact SHA", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");
  const release =
    workflow.match(
      /  sidewalk-readiness-full:[\s\S]*?\n  central-after-sidewalk-micro:/,
    )?.[0] ?? "";

  assert.match(
    release,
    /needs: \[sidewalk-readiness-lane, sidewalk-readiness-micro\]/,
  );
  assert.doesNotMatch(release, /needs\.sidewalk-readiness-checkpoint\.result/);
  assert.match(release, /Require MICRO and CHECKPOINT for the exact SHA/);
  assert.match(release, /commits\/\$SHA\/check-runs/);
  assert.match(release, /COMUN_SIDEWALK_CHECKPOINT_REUSED_EXACT_SHA/);
});
