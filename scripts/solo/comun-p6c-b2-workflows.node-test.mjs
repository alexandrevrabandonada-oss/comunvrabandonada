import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("P6C-B2 preflight remains metadata-only and plans exactly one migration", () => {
  const workflow = read(".github/workflows/comun-p6c-b2-preflight.yml");
  assert.match(workflow, /begin read only/);
  assert.match(workflow, /businessRowsRead/);
  assert.match(workflow, /COMUN_P6C_B2_REMOTE_PLAN_EXACT_ONE/);
  assert.doesNotMatch(workflow, /select\s+original_text/i);
  assert.doesNotMatch(
    workflow,
    /supabase\s+(?:db reset|migration repair|seed)/i,
  );
  assert.doesNotMatch(workflow, /supabase db push[^\n]*--include-all/i);
});

test("P6C-B2 disposable runtime is isolated and forbids sensitive forwarding", () => {
  const workflow = read(".github/workflows/comun-p6c-b2-runtime-e2e.yml");
  const script = read(
    "scripts/solo/rehearse-p6c-b2-child-protection-private-local.mjs",
  );
  assert.match(
    workflow,
    /COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED=enabled/,
  );
  assert.match(
    workflow,
    /COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED=disabled/,
  );
  assert.match(
    workflow,
    /COMUN_P6C_B2_CHILD_PROTECTION_PRIVATE_DISPOSABLE_E2E_GREEN/,
  );
  assert.match(script, /otherWallet: "isolated"/);
  assert.match(script, /externalRequests: 0/);
  assert.match(script, /hardDeletes/);
  assert.doesNotMatch(
    script,
    /window\.open|wa\.me|mailto:|person_declared_sent/,
  );
});

test("P6C-B2 activation is exact-head, flags-off first, soft cleanup, and rollback capable", () => {
  const workflow = read(".github/workflows/comun-p6c-b2-activation.yml");
  const script = read(
    "scripts/solo/rehearse-p6c-b2-child-protection-private-production.mjs",
  );
  assert.match(
    workflow,
    /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/,
  );
  assert.match(workflow, /promote-migration-flags-off/);
  assert.match(
    workflow,
    /COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED production/,
  );
  assert.match(
    workflow,
    /COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED production/,
  );
  assert.match(workflow, /rollback-private-routing/);
  assert.match(
    workflow,
    /COMUN_P6C_B2_CHILD_PROTECTION_PRIVATE_WAVE1_PRODUCTION_GREEN/,
  );
  assert.match(script, /finally/);
  assert.match(script, /activeSyntheticReports: 0/);
  assert.match(script, /activeSyntheticWallets: 0/);
  assert.match(script, /externalRequests: 0/);
  assert.match(script, /hardDeletes: 0/);
  assert.doesNotMatch(script, /\bdelete\s+from\b/i);
  assert.doesNotMatch(
    script,
    /window\.open|wa\.me|mailto:|person_declared_sent/,
  );
});
