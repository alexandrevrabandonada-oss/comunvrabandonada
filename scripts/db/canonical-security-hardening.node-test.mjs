import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260723220112_comun_canonical_security_hardening.sql";
const sql = (await readFile(migrationPath, "utf8")).toLowerCase();
const executableSql = sql
  .replace(/--.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/'(?:''|[^'])*'/g, "''");
const baseline = JSON.parse(
  await readFile("reports/current/comun-remote-schema-baseline.json", "utf8"),
);

test("security hardening is a single transactional forward-only migration", () => {
  assert.match(sql, /^begin;/);
  assert.match(sql, /commit;\s*$/);
  assert.doesNotMatch(executableSql, /\b(drop|truncate|delete)\b/);
  assert.match(sql, /security_invoker\s*=\s*true/);
  assert.match(sql, /alter default privileges for role postgres in schema public/);
  assert.doesNotMatch(sql, /alter default privileges for role supabase_admin/);
  assert.doesNotMatch(sql, /pg_has_role[\s\S]*supabase_admin/);
  assert.match(sql, /claim_next_archive_processing_job\(text\)[\s\S]*search_path = pg_catalog/);
  console.log("COMUN_CANONICAL_SECURITY_HARDENING_OK");
});

test("handle_new_user is preserved and hardened without authorization changes", () => {
  assert.doesNotMatch(sql, /drop\s+(function|trigger)[\s\S]*handle_new_user/);
  assert.match(sql, /alter function public\.handle_new_user\(\) set search_path = pg_catalog/);
  assert.match(sql, /revoke all on function public\.handle_new_user\(\)[\s\S]*public, anon, authenticated/);
  assert.doesNotMatch(sql, /raw_user_meta_data[\s\S]*(role|authorization|permission)/);
  console.log("COMUN_HANDLE_NEW_USER_CONTRACT_OK");
});

test("public reports contract exposes only the sanitized projection", () => {
  const view = baseline.canonical.relations.find(
    (relation) => relation.schema === "public" && relation.name === "comun_public_reports",
  );
  assert.ok(view);
  for (const privateColumn of [
    "raw_text",
    "private_contact",
    "internal_notes",
    "latitude",
    "longitude",
    "location_accuracy",
  ]) {
    assert.doesNotMatch(view.definition, new RegExp(`\\b${privateColumn}\\b`));
  }
  assert.match(sql, /revoke all privileges on table public\.comun_public_reports/);
  assert.match(sql, /grant select on table public\.comun_public_reports to anon, authenticated/);
  assert.match(sql, /public can read sanitized published reports/);
  assert.match(sql, /status = 'published'/);
  assert.match(sql, /can_publish_sanitized is true/);
  console.log("COMUN_PUBLIC_REPORTS_CONTRACT_OK");
});

test("migration checksum is deterministic", () => {
  const checksum = createHash("sha256").update(sql).digest("hex");
  assert.equal(checksum.length, 64);
});

test("schema release ledger is private, idempotent and fail-closed", () => {
  assert.match(sql, /create table if not exists public\.comun_schema_releases/);
  assert.match(sql, /alter table public\.comun_schema_releases enable row level security/);
  assert.match(sql, /revoke all privileges on table public\.comun_schema_releases[\s\S]*public, anon, authenticated/);
  assert.match(sql, /comun_schema_release_ledger_divergence/);
  assert.match(sql, /if found then[\s\S]*else[\s\S]*insert into public\.comun_schema_releases/);
  assert.doesNotMatch(sql, /supabase_migrations\.schema_migrations/);
  console.log("COMUN_SCHEMA_RELEASE_LEDGER_OK");
});
