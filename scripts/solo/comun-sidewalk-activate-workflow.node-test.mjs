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

test("sidewalk workflow separates read-only preflight, migration, and activation", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const preflight = job(workflow, "preflight", "migrate");
  const migrate = job(workflow, "migrate", "postflight");
  const postflight = job(workflow, "postflight", "activate");
  const activate = workflow.match(/  activate:[\s\S]*$/)?.[0] ?? "";

  assert.match(
    workflow,
    /options: \[preflight, vercel-preflight, migrate, activate\]/,
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
  assert.notEqual(
    workflow.indexOf("AUTORIZO_MIGRATION_CALCADAS_"),
    workflow.indexOf("AUTORIZO_ATIVAR_CALCADAS_"),
  );
});

test("Vercel credential preflight is fixed, read-only, and cannot activate", async () => {
  const workflow = await readFile(workflowPath, "utf8");
  const vercelPreflight = job(workflow, "vercel-preflight", "preflight");

  assert.match(vercelPreflight, /if: inputs\.mode == 'vercel-preflight'/);
  assert.match(vercelPreflight, /needs: validate-input/);
  assert.match(vercelPreflight, /test -n "\$VERCEL_TOKEN"/);
  assert.match(vercelPreflight, /team_LBVwyK8FQMO7tA3hzVXXeumF/);
  assert.match(vercelPreflight, /prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X/);
  assert.match(
    vercelPreflight,
    /https:\/\/api\.vercel\.com\/v9\/projects\/\$\{VERCEL_PROJECT_ID\}\?teamId=\$\{VERCEL_ORG_ID\}/,
  );
  assert.match(vercelPreflight, /COMUN_VERCEL_PROTECTED_ACCESS_READ_GREEN/);
  assert.doesNotMatch(
    vercelPreflight,
    /vercel@|env add|--prod|COMUN_SIDEWALK_OPERATIONAL_V2|apply-forward-only\.mjs/,
  );
  assert.doesNotMatch(vercelPreflight, /-X\s*(?:POST|PUT|PATCH|DELETE)/i);
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
  assert.match(checkpoint, /Upload sidewalk readiness E2E evidence/);
  assert.match(
    checkpoint,
    /comun-sidewalk-readiness-e2e-\$\{\{ github\.sha \}\}/,
  );
  assert.match(checkpoint, /test-results\/evidence/);
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

test("sidewalk readiness release waits for the exact checkpoint instead of racing it", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");
  const release =
    workflow.match(
      /  sidewalk-readiness-full:[\s\S]*?\n  central-after-sidewalk-micro:/,
    )?.[0] ?? "";

  assert.match(release, /needs: sidewalk-readiness-checkpoint/);
  assert.match(
    release,
    /needs\.sidewalk-readiness-checkpoint\.result == 'success'/,
  );
  assert.match(release, /Require MICRO and CHECKPOINT for the exact SHA/);
});
