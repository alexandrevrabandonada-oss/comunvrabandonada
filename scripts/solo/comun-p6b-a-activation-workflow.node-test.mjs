import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(
  ".github/workflows/comun-p6b-a-activation.yml",
  "utf8",
);
const smoke = readFileSync(
  "scripts/solo/rehearse-p6b-a-environmental-incidents-production.mjs",
  "utf8",
);

test("P6B-A activation is exact-head, zero-migration, two-flag and reversible", () => {
  assert.match(
    workflow,
    /test "\$\(git rev-parse HEAD\)" = "\$EXPECTED_MAIN_SHA"/,
  );
  assert.match(
    workflow,
    /options: \[flags-off, wave1-classification, rollback-classification\]/,
  );
  assert.match(workflow, /COMUN_ENVIRONMENTAL_INCIDENTS_ENABLED production/);
  assert.match(
    workflow,
    /COMUN_ENVIRONMENTAL_FORWARDING_ASSISTED_ENABLED production/,
  );
  assert.match(workflow, /environmental_incidents.*wc -l\)" -eq 0/);
  assert.match(workflow, /CLASSIFICATION_ROLLED_BACK_AFTER_FAILED_GATE/);
  assert.doesNotMatch(workflow, /wave2|person_declared_sent/);
});

test("P6B-A Production proof is private, synthetic, no-send and soft-cleaned", () => {
  assert.match(smoke, /TESTE SINTETICO PRIVADO/);
  assert.match(smoke, /active_fire/);
  assert.match(smoke, /smoke_or_environmental_trace/);
  assert.match(smoke, /environmental_pollution/);
  assert.match(smoke, /waste_or_debris/);
  assert.match(smoke, /activeSyntheticReports: 0/);
  assert.match(smoke, /activeSyntheticWalletItems: 0/);
  assert.match(smoke, /activeSyntheticPackages: 0/);
  assert.match(smoke, /publicSnapshots: 0/);
  assert.match(smoke, /externalRequests: 0/);
  assert.match(smoke, /hardDeletes: 0/);
  assert.doesNotMatch(smoke, /\bdelete\s+from\b/i);
  assert.doesNotMatch(smoke, /window\.open|wa\.me|mailto:/i);
});
