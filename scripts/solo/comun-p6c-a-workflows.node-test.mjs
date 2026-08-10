import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("P6C-A preflight is read-only and expects an empty migration plan", () => {
  const workflow = read(".github/workflows/comun-p6c-a-preflight.yml");
  assert.match(workflow, /begin read only/);
  assert.match(workflow, /publicHealthPresent/);
  assert.match(workflow, /publicEducationPreserved/);
  assert.match(workflow, /businessRowsRead/);
  assert.match(workflow, /COMUN_P6C_A_REMOTE_MIGRATION_PLAN_EMPTY/);
  assert.doesNotMatch(
    workflow,
    /supabase db push[^\n]*--include-all|supabase migration repair|supabase db reset/,
  );
});

test("P6C-A activation is exact-head, no-send and reversible", () => {
  const workflow = read(".github/workflows/comun-p6c-a-activation.yml");
  const smoke = read("scripts/solo/rehearse-p6c-a-sus-private-production.mjs");
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/);
  assert.match(workflow, /options: \[flags-off, wave1-private-routing, rollback-private-routing\]/);
  assert.match(workflow, /COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED production/);
  assert.match(workflow, /COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED production/);
  assert.match(workflow, /PRIVATE_ROUTING_ROLLED_BACK_AFTER_FAILED_GATE/);
  assert.match(smoke, /TESTE SINTETICO PRIVADO/);
  assert.match(smoke, /activeSyntheticReports: 0/);
  assert.match(smoke, /activeSyntheticWalletItems: 0/);
  assert.match(smoke, /activeSyntheticPackages: 0/);
  assert.match(smoke, /externalRequests: 0/);
  assert.match(smoke, /hardDeletes: 0/);
  assert.doesNotMatch(smoke, /\bdelete\s+from\b/i);
  assert.doesNotMatch(smoke, /window\.open|wa\.me|mailto:|person_declared_sent/i);
});
