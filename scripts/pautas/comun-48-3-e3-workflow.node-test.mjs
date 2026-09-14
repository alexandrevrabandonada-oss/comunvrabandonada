import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const preflight = readFileSync(
  ".github/workflows/comun-48-3-e3-preflight.yml",
  "utf8",
);

test("E3 preflight classifies migration ownership and remains metadata-only", () => {
  assert.match(preflight, /begin read only;/);
  assert.match(preflight, /businessContentRead', false/);
  assert.match(preflight, /github\.event\.pull_request\.base\.sha/);
  assert.match(preflight, /classify-migration-lane\.mjs --lane 48-3-e3/);
  assert.match(
    preflight,
    /20260814160000_comun_pauta_low_friction_creation\.sql/,
  );
  assert.match(preflight, /domainMigrationCount=/);
  assert.match(preflight, /foreignKnownPendingCount=/);
  assert.match(preflight, /COMUN_48_3_E3_REMOTE_PREFLIGHT_GREEN/);
  assert.doesNotMatch(preflight, /select\s+\*\s+from/i);
  assert.match(
    preflight,
    /! grep -Eq -- '--include-all\|migration repair\|db reset\|seed'/,
  );
});
