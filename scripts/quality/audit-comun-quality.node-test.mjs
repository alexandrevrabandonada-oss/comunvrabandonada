import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("quality contracts remain private, progressive and canonical", () => {
  const output = execFileSync(
    process.execPath,
    ["scripts/quality/audit-comun-quality.mjs"],
    { encoding: "utf8" },
  );
  const report = JSON.parse(output.trim());
  assert.equal(report.result, "COMUN_QUALITY_AUTOMATED_CONTRACT_GREEN");
  assert.ok(Object.values(report.checks).every(Boolean));
  assert.equal(report.privacy, "aggregate_only");
});
