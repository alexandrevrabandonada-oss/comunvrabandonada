import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonical = path.join(root, "supabase", "migrations");
const local = path.join(root, "supabase", "local-migrations");
const manifests = path.join(root, "supabase", "local-releases");

test("production CLI chain excludes explicit local-only migrations", () => {
  const names = fs.readdirSync(canonical);
  assert.ok(names.includes("20260805130000_comun_production_pilot_core_bundle.sql"));
  assert.deepEqual(
    names.filter((name) => name.startsWith("20260805") && name.endsWith(".sql")).sort(),
    [
      "20260805130000_comun_production_pilot_core_bundle.sql",
      "20260805201000_comun_production_pilot_attachment_rpc_fix.sql",
      "20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql",
    ],
  );
  assert.ok(!names.some((name) => name.startsWith("20260803") || name.startsWith("20260804") || name.startsWith("20260805090000")));
  assert.ok(fs.readdirSync(local).length >= 12);
});

test("every local-only manifest points outside the CLI chain", () => {
  for (const file of fs.readdirSync(manifests).filter((name) => name.endsWith(".json"))) {
    const value = JSON.parse(fs.readFileSync(path.join(manifests, file), "utf8"));
    if (!value.localOnly) continue;
    assert.match(value.migration, /^supabase\/local-migrations\//, file);
    assert.ok(fs.existsSync(path.join(root, value.migration)), file);
  }
});
