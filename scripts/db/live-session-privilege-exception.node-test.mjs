import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { permitsReviewedLiveSessionHelper as permits } from "./live-session-privilege-exception.mjs";

const file = "20261024174838_comun_legacy_private_live_session.sql";
const sql = await readFile(`supabase/migrations/${file}`, "utf8");
const config = await readFile("supabase/config.toml", "utf8");

test("only the complete reviewed private own-session contract is admitted", () => {
  assert.equal(permits(file, sql, config), true);
  assert.equal(permits("other.sql", sql, config), false);
  assert.equal(permits(file, "-- comment\n" + sql, config), false);
});

for (const [name, mutate] of [
  ["public RPC", (s) => s.replaceAll("comun_auth_private.", "public.")],
  [
    "caller-supplied identity",
    (s) =>
      s.replaceAll(
        "current_session_active()",
        "current_session_active(subject uuid)",
      ),
  ],
  [
    "different return type",
    (s) => s.replace("returns boolean", "returns jsonb"),
  ],
  ["unscoped users", (s) => s.replace("u.id=auth.uid()", "true")],
  ["revoked session bypass", (s) => s.replace("s.user_id=auth.uid()", "true")],
  ["banned user bypass", (s) => s.replace("u.banned_until<=now()", "true")],
  [
    "unsafe search path",
    (s) => s.replace("search_path=pg_catalog", "search_path=public"),
  ],
  ["anon execute", (s) => s.replace("to authenticated;", "to anon;")],
  [
    "broader grant",
    (s) => s.replace("to authenticated;", "to authenticated, service_role;"),
  ],
  [
    "grant option",
    (s) =>
      s.replace("to authenticated;", "to authenticated with grant option;"),
  ],
  [
    "additional SQL",
    (s) =>
      s + "\ngrant execute on all functions in schema public to authenticated;",
  ],
  [
    "permissive barrier",
    (s) => s.replaceAll("as restrictive", "as permissive"),
  ],
]) {
  test(`exception rejects ${name}`, () =>
    assert.equal(permits(file, mutate(sql), config), false));
}

test("API exposure, missing or duplicate API configuration fail closed", () => {
  for (const invalid of [
    "",
    "[api]\nenabled=true",
    '[api]\nschemas=["public", "comun_auth_priva\\u0074e"]',
    '[api]\nschemas=["public", "comun_auth_private"]',
    '[api]\nschemas=["public"]\nschemas=["public"]',
    '[api]\nschemas=["public"]\n[api]\nschemas=["comun_auth_private"]',
  ])
    assert.equal(permits(file, sql, invalid), false);
});
