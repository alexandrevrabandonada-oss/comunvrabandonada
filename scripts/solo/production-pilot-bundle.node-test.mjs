import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath =
  "supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql";
const manifestPath =
  "supabase/releases/20260805130000-comun-production-pilot-core-bundle.json";

test("R2A bundle manifest is exact and promotion-gated", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sha = createHash("sha256").update(sql).digest("hex");
  assert.equal(manifest.sha256, sha);
  assert.equal(manifest.requiresPromotion, true);
  assert.equal(manifest.remotePromotionAllowed, true);
  assert.equal(manifest.scope, "production");
  assert.equal(manifest.status, "runtime_schema_alignment_required");
  assert.equal(manifest.remoteWrites, false);
  assert.equal(manifest.publicProjection, false);
  assert.equal(manifest.externalForwarding, false);
  assert.deepEqual(manifest.waves, [
    "account_and_wallet",
    "relata_v2_private",
    "private_evidence_and_location",
  ]);
});

test("R2A bundle uses canonical runtime names and forced RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /begin;[\s\S]*commit;/);
  assert.doesNotMatch(sql, /\b(drop\s+table|drop\s+schema|delete\s+from)\b/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
  assert.doesNotMatch(sql, /comun_production_/);
  for (const table of [
    "comun_participation_wallets",
    "comun_participation_wallet_items",
    "comun_participation_wallet_events",
    "comun_participation_wallet_recovery_credentials",
    "comun_participation_wallet_account_links",
    "comun_relata_reports",
    "comun_relata_private_locations",
    "comun_relata_attachments",
  ]) {
    assert.match(sql, new RegExp(`private\\.${table}`));
    assert.match(sql, /alter table private\.%I enable row level security/);
    assert.match(sql, /force row level security/);
  }
  for (const fn of [
    "comun_relata_create",
    "comun_relata_get_receipt",
    "comun_participation_wallet_create",
    "comun_participation_wallet_link_account",
  ]) assert.match(sql, new RegExp(`public\\.${fn}`));
  assert.match(sql, /revoke all on schema private from public, anon, authenticated;/);
  assert.match(sql, /grant usage on schema private to service_role;/);
  assert.match(sql, /COMUN_48_1B_R2A_BLOCKED_REMOTE_PRE_OBJECT_CONFLICT/);
  assert.match(sql, /comun-relata-private/);
});
