import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20260826090000_comun_denuncias_public_collective_projection.sql");
const localMap = read("supabase/local-migrations/20260803200000_comun_relata_sanitized_local_map.sql");
const feature = read("lib/comun-denuncias-public-map-feature.ts");
const page = read("app/comun/denuncias/mapa/page.tsx");
const api = read("app/api/comun/denuncias/mapa/cases/route.ts");

test("B0 migration is a new fail-closed schema and does not promote the local map", () => {
  assert.match(migration, /COMUN_48_6_B0_BLOCKED_LOCAL_PROJECTION_DRIFT/);
  assert.match(migration, /COMUN_48_6_B0_BLOCKED_COLLECTIVE_SCHEMA_DRIFT/);
  assert.match(migration, /future_map_eligibility/);
  assert.match(migration, /comun_relata_public_projection_consents/);
  assert.doesNotMatch(migration, /create table if not exists/);
  assert.doesNotMatch(migration, /\b(drop|alter|insert)\s+(?:table\s+)?public\.comun_relata_public_snapshots\b/i);
  assert.doesNotMatch(migration, /storage\.buckets/);
  assert.match(localMap, /Never promote remotely/);
});

test("B0 keeps the Production map fail-closed and separate from local compatibility", () => {
  assert.match(feature, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED/);
  assert.match(feature, /env\[COMUN_DENUNCIAS_PUBLIC_MAP_FLAG\] === "enabled"/);
  assert.match(page, /if \(!isComunDenunciasPublicMapEnabled\(\)\) notFound\(\)/);
  assert.match(api, /export async function GET/);
  assert.doesNotMatch(api, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.doesNotMatch(page, /ComunRelataLocalMap/);
  assert.doesNotMatch(api, /policyVersion|projectionState|case_id|report_id|membership_id/i);
});

test("B0 has no projection or confirmation rows at migration top level", () => {
  const firstFunction = migration.indexOf("create or replace function");
  assert.ok(firstFunction > 0);
  assert.doesNotMatch(migration.slice(0, firstFunction), /\binsert\s+into\b/i);
  assert.doesNotMatch(migration.slice(0, firstFunction), /\bupdate\s+\w|\bdelete\s+from\b/i);
});

test("B0 Production rollout is schema-only and map-off", () => {
  const runner = read("scripts/run-48-6-b0-production.sh");
  assert.match(runner, /COMUN_48_6_B0_SCHEMA_GREEN_MAP_OFF_NO_PROJECTION/);
  assert.doesNotMatch(runner, /\bsupabase\s+(?:migration\s+repair|db\s+reset|seed)\b/);
  assert.doesNotMatch(runner, /supabase\s+db\s+push[^\n]*--include-all/);
  assert.doesNotMatch(runner, /COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED.*(add|rm|pull)/);
});
