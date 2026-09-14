import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(stats) {
  const dir = mkdtempSync(join(tmpdir(), "comun-browser-count-"));
  const listed = join(dir, "listed.json");
  const result = join(dir, "result.json");
  writeFileSync(
    listed,
    JSON.stringify({ suites: [{ specs: [{ tests: [{}, {}] }] }] }),
  );
  writeFileSync(result, JSON.stringify({ stats }));
  return spawnSync(
    process.execPath,
    ["scripts/ci/verify-playwright-complete.mjs", listed, result],
    {
      encoding: "utf8",
    },
  );
}

test("accepts only a complete dynamically listed suite", () => {
  assert.equal(run({ expected: 2, unexpected: 0, skipped: 0 }).status, 0);
});

test("fails closed on failures, skips, or count mismatch", () => {
  assert.equal(run({ expected: 1, unexpected: 1, skipped: 0 }).status, 1);
  assert.equal(run({ expected: 1, unexpected: 0, skipped: 1 }).status, 1);
  assert.equal(run({ expected: 1, unexpected: 0, skipped: 0 }).status, 1);
});
