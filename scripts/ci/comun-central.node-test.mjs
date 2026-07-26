import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const ignoreScript = "scripts/ci/vercel-ignore-build.mjs";

test("Vercel ignores only docs and reports changes", () => {
  const source = readFileSync(ignoreScript, "utf8");
  assert.match(source, /file\.startsWith\("docs\/"\)/);
  assert.match(source, /file\.startsWith\("reports\/"\)/);
  assert.match(source, /process\.exit\(0\)/);
  assert.match(source, /COMUN_VERCEL_BUILD_REQUIRED/);
});

test("COMUN Central updater never handles database credentials", () => {
  const source = readFileSync("scripts/ci/update-comun-central.mjs", "utf8");
  assert.match(source, /COMUN_CENTRAL_UPDATED/);
  assert.doesNotMatch(source, /SUPABASE|DATABASE_URL|SERVICE_ROLE|password/i);
});

test("CI scripts have valid JavaScript syntax", () => {
  for (const file of [ignoreScript, "scripts/ci/update-comun-central.mjs"]) {
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
  }
});
