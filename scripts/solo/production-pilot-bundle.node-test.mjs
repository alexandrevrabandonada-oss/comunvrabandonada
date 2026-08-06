import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath =
  "supabase/migrations/20260805130000_comun_production_pilot_core_bundle.sql";
const manifestPath =
  "supabase/releases/20260805130000-comun-production-pilot-core-bundle.json";
const attachmentFixMigrationPath =
  "supabase/migrations/20260805201000_comun_production_pilot_attachment_rpc_fix.sql";
const attachmentFixManifestPath =
  "supabase/releases/20260805201000-comun-production-pilot-attachment-rpc-fix.json";
const chainManifestPath =
  "supabase/releases/20260805130000-comun-production-pilot-core-chain.json";
const walletFixMigrationPath =
  "supabase/migrations/20260805212659_comun_production_pilot_wallet_account_rpc_fix.sql";
const walletFixManifestPath =
  "supabase/releases/20260805212659-comun-production-pilot-wallet-account-rpc-fix.json";
const chainV2ManifestPath =
  "supabase/releases/20260805214000-comun-production-pilot-core-chain-v2.json";

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
    "comun_participation_wallet_revoke_account",
  ]) assert.match(sql, new RegExp(`public\\.${fn}`));
  assert.match(sql, /revoke all on schema private from public, anon, authenticated;/);
  assert.match(sql, /grant usage on schema private to service_role;/);
  assert.match(sql, /COMUN_48_1B_R2A_BLOCKED_REMOTE_PRE_OBJECT_CONFLICT/);
  assert.match(sql, /comun-relata-private/);
});

test("R2A attachment fix is forward-only and preserves the candidate checksum", async () => {
  const candidate = await readFile(migrationPath, "utf8");
  const fix = await readFile(attachmentFixMigrationPath, "utf8");
  const fixManifest = JSON.parse(await readFile(attachmentFixManifestPath, "utf8"));
  const chain = JSON.parse(await readFile(chainManifestPath, "utf8"));
  assert.equal(createHash("sha256").update(candidate).digest("hex"), "0648404b49be00b2d46dc5431c1bde4cb0072bf0f27a1c8f42075bb522cdd4f9");
  assert.equal(fixManifest.sha256, createHash("sha256").update(fix).digest("hex"));
  assert.equal(fixManifest.migrationSha256, fixManifest.sha256);
  assert.equal(fixManifest.dependsOn, "20260805130000-comun-production-pilot-core-bundle");
  assert.equal(fixManifest.dataMutation, false);
  assert.equal(fixManifest.publicProjection, false);
  assert.equal(fixManifest.externalForwarding, false);
  assert.match(fix, /coalesce\(max\(a\.label_index\), 0\)/);
  assert.match(fix, /for update/);
  assert.match(fix, /revoke all on function public\.comun_relata_begin_attachment/);
  assert.match(fix, /grant execute on function public\.comun_relata_begin_attachment/);
  assert.doesNotMatch(fix, /\b(drop\s+(table|schema)|truncate|delete\s+from|update\s+)/i);
  assert.deepEqual(chain.migrations.map((entry) => entry.path), [migrationPath, attachmentFixMigrationPath]);
  assert.deepEqual(chain.migrations.map((entry) => entry.order), [1, 2]);
  assert.equal(chain.activationRequiresCompleteChain, true);
});

test("R2A wallet-account fix is forward-only and forms the exact v2 chain", async () => {
  const fix = await readFile(walletFixMigrationPath, "utf8");
  const manifest = JSON.parse(await readFile(walletFixManifestPath, "utf8"));
  const chain = JSON.parse(await readFile(chainV2ManifestPath, "utf8"));
  assert.equal(manifest.sha256, createHash("sha256").update(fix).digest("hex"));
  assert.equal(manifest.migrationSha256, manifest.sha256);
  assert.deepEqual(manifest.dependsOn, [
    "20260805130000-comun-production-pilot-core-bundle",
    "20260805201000-comun-production-pilot-attachment-rpc-fix",
  ]);
  assert.equal(manifest.dataMutation, false);
  assert.equal(manifest.publicProjection, false);
  assert.equal(manifest.externalForwarding, false);
  assert.match(fix, /create or replace function public\.comun_participation_wallet_link_account/);
  assert.match(fix, /v_wallet_id/);
  assert.match(fix, /on conflict on constraint\s+comun_participation_wallet_account_links_wallet_id_user_id_key/);
  assert.doesNotMatch(fix, /on conflict\s*\(\s*wallet_id\s*,\s*user_id\s*\)/i);
  assert.match(fix, /revoke all on function public\.comun_participation_wallet_link_account/);
  assert.match(fix, /grant execute on function public\.comun_participation_wallet_link_account/);
  assert.deepEqual(chain.migrations.map((entry) => entry.path), [migrationPath, attachmentFixMigrationPath, walletFixMigrationPath]);
  assert.deepEqual(chain.migrations.map((entry) => entry.order), [1, 2, 3]);
  assert.equal(chain.activationRequiresCompleteChain, true);
});
