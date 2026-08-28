import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const script = path.resolve(import.meta.dirname, "assert-sanitized-artifact.mjs");
const temp = (name, value) => { const file = path.join(os.tmpdir(), `comun-r5-${name}-${process.pid}.json`); fs.writeFileSync(file, JSON.stringify(value)); return file; };
const valid = { locationKey: { present: true, type: "sensitive", productionOnly: true, provenance: "p3b_runtime_validated", written: false }, spatialKey: { present: true, type: "sensitive", productionOnly: true, provenance: "r5_independent_random_32_bytes", generatedShape: "32_byte_base64url", written: true }, secretReadback: false, productionEnvWrites: 1, productionSchemaWrites: 0, productionBusinessWrites: 0, artifactSanitizerActuallyExecuted: true };

test("allowlisted R5 artifact passes without depending on rg", () => {
  const file = temp("valid", valid);
  const result = spawnSync(process.execPath, [script, file, "r5"], { env: { PATH: "" }, encoding: "utf8" });
  fs.rmSync(file, { force: true });
  assert.equal(result.status, 0, result.stderr);
});

test("forbidden field fails even when rg is unavailable", () => {
  const file = temp("field", { ...valid, value: "secret-value" });
  const result = spawnSync(process.execPath, [script, file, "r5"], { env: { PATH: "" }, encoding: "utf8" });
  fs.rmSync(file, { force: true });
  assert.notEqual(result.status, 0);
});

test("secret-like value fails the actual sanitizer", () => {
  const file = temp("value", { ...valid, locationKey: { ...valid.locationKey, provenance: "secret-value" } });
  const result = spawnSync(process.execPath, [script, file, "r5"], { encoding: "utf8" });
  fs.rmSync(file, { force: true });
  assert.notEqual(result.status, 0);
});
