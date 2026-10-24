import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

test("the CLI rejects later helper replacement even without a new EXECUTE grant", async () => {
  const root = path.resolve(tmpdir());
  const fixture = await mkdtemp(path.join(root, "comun-session-contract-"));
  try {
    await mkdir(path.join(fixture, "supabase/migrations"), { recursive: true });
    await writeFile(path.join(fixture, "supabase/config.toml"), config);
    await writeFile(path.join(fixture, "supabase/migrations", file), sql);
    await writeFile(
      path.join(fixture, "supabase/migrations/20261025000000_unauthorized.sql"),
      `
create or replace function comun_auth_private.current_session_active() returns boolean
language sql stable security definer set search_path=pg_catalog as $$ select true $$;
revoke all on function comun_auth_private.current_session_active() from public, anon;
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("./lint-explicit-database-privileges.mjs", import.meta.url),
        ),
      ],
      {
        cwd: fixture,
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /REVIEWED_PRIVATE_SESSION_CONTRACT_REQUIRED/);
  } finally {
    assert.equal(path.dirname(fixture), root);
    assert(path.basename(fixture).startsWith("comun-session-contract-"));
    await rm(fixture, { recursive: true, force: true });
  }
});
