import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath =
  "supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql";
const manifestPath =
  "supabase/releases/20260805130000-comun-production-pilot-core-bundle.json";

test("R2 bundle manifest is exact and promotion-gated", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sha = createHash("sha256").update(sql).digest("hex");
  assert.equal(manifest.sha256, sha);
  assert.equal(manifest.requiresPromotion, true);
  assert.equal(manifest.remotePromotionAllowed, true);
  assert.equal(manifest.scope, "production");
  assert.equal(manifest.status, "ready_for_exact_dry_run");
  assert.equal(manifest.remoteWrites, false);
  assert.equal(manifest.publicProjection, false);
  assert.equal(manifest.externalForwarding, false);
  assert.deepEqual(manifest.waves, [
    "account_and_wallet",
    "relata_v2_private",
    "private_evidence_and_location",
  ]);
});

test("R2 bundle is additive and protected by forced RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /begin;[\s\S]*commit;/);
  assert.doesNotMatch(sql, /\b(drop\s+table|drop\s+schema|delete\s+from|update\s+)/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
  for (const table of [
    "wallets",
    "wallet_items",
    "wallet_events",
    "wallet_recovery",
    "relata_reports",
    "relata_evidence",
    "relata_locations",
  ]) {
    assert.match(sql, new RegExp(`private\\.comun_production_${table}`));
    assert.match(sql, new RegExp(`alter table private\\.comun_production_${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table private\\.comun_production_${table} force row level security`));
  }
  assert.match(sql, /revoke all on table[\s\S]*from public, anon, authenticated;/);
  assert.match(sql, /grant all on table[\s\S]*to service_role;/);
});
