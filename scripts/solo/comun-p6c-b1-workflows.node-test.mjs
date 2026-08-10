import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("P6C-B1 preflight is metadata-only and preserves B1 while B2 is planned", () => {
  const workflow = read(".github/workflows/comun-p6c-b1-preflight.yml");
  assert.match(workflow, /begin read only/);
  assert.match(workflow, /publicHealthPresent/);
  assert.match(workflow, /publicEducationPreserved/);
  assert.match(workflow, /workplacePreserved/);
  assert.match(workflow, /educationRoutingVersionPresent/);
  assert.match(workflow, /educationSubtypePersistencePresent/);
  assert.match(workflow, /businessRowsRead/);
  assert.match(
    workflow,
    /COMUN_P6C_B1_BASELINE_PRESERVED_P6C_B2_PLAN_EXACT_ONE/,
  );
  assert.doesNotMatch(
    workflow,
    /supabase db push[^\n]*--include-all|supabase migration repair|supabase db reset|seed\.sql/,
  );
});

test("P6C-B1 disposable runtime is isolated and forwarding stays off", () => {
  const workflow = read(".github/workflows/comun-p6c-b1-runtime-e2e.yml");
  const runtime = read(
    "scripts/solo/rehearse-p6c-b1-public-education-private-local.mjs",
  );
  assert.match(workflow, /test -z "\$\{SUPABASE_ACCESS_TOKEN:-\}"/);
  assert.match(
    workflow,
    /COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED=enabled/,
  );
  assert.match(
    workflow,
    /COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED=disabled/,
  );
  assert.match(
    workflow,
    /COMUN_P6C_B1_PUBLIC_EDUCATION_PRIVATE_DISPOSABLE_E2E_GREEN/,
  );
  assert.match(runtime, /otherWallet: "isolated"/);
  assert.match(
    runtime,
    /photoOnlyEnrichment: "same_report_case_protocol_wallet"/,
  );
  assert.match(runtime, /externalRequests: 0/);
  assert.match(runtime, /hardDeletes/);
  assert.doesNotMatch(
    runtime,
    /window\.open|wa\.me|mailto:|person_declared_sent/i,
  );
});

test("P6C-B1 activation is exact-head, no-send, cleanup-safe and reversible", () => {
  const workflow = read(".github/workflows/comun-p6c-b1-activation.yml");
  const smoke = read(
    "scripts/solo/rehearse-p6c-b1-public-education-private-production.mjs",
  );
  assert.match(
    workflow,
    /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/,
  );
  for (const mode of [
    "promote-migration-flags-off",
    "flags-off",
    "wave1-private-routing",
    "rollback-private-routing",
  ])
    assert.match(workflow, new RegExp(mode));
  assert.match(workflow, /COMUN_P6C_B1_POSTFLIGHT_FAILED/);
  assert.match(
    workflow,
    /COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED production/,
  );
  assert.match(
    workflow,
    /COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED production/,
  );
  assert.doesNotMatch(
    workflow,
    /env add COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED/,
  );
  assert.match(workflow, /PRIVATE_ROUTING_ROLLED_BACK_AFTER_FAILED_GATE/);
  assert.match(smoke, /TESTE SINTETICO PRIVADO/);
  assert.match(smoke, /activeSyntheticReports: 0/);
  assert.match(smoke, /activeSyntheticWalletItems: 0/);
  assert.match(smoke, /activeSyntheticPackages: 0/);
  assert.match(smoke, /externalRequests: 0/);
  assert.match(smoke, /hardDeletes: 0/);
  assert.doesNotMatch(smoke, /\bdelete\s+from\b/i);
  assert.doesNotMatch(
    smoke,
    /window\.open|wa\.me|mailto:|person_declared_sent/i,
  );
});
