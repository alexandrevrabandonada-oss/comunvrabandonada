import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260729205156_allow_anonymous_sidewalk_auth_without_legacy_profile.sql";
const sql = readFileSync(migrationPath, "utf8");

test("anonymous Auth users bypass only the legacy public profile insert", () => {
  assert.match(sql, /if new\.is_anonymous is true then\s+return new;/);
  assert.match(
    sql,
    /insert into public\.profiles \(id, username, display_name\)/,
  );
  assert.match(sql, /on conflict \(id\) do nothing/);
});

test("the migration preserves the hardened trigger contract", () => {
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = pg_catalog/);
  assert.match(
    sql,
    /revoke all on function public\.handle_new_user\(\) from public, anon, authenticated/,
  );
  assert.match(
    sql,
    /grant execute on function public\.handle_new_user\(\) to service_role/,
  );
});

test("the repair is scoped and contains no profile or Auth data mutation", () => {
  assert.doesNotMatch(sql, /\b(update|delete|truncate)\b/i);
  assert.doesNotMatch(sql, /insert into auth\./i);
  assert.doesNotMatch(sql, /insert into storage\./i);
  assert.doesNotMatch(sql, /alter table/i);
});
