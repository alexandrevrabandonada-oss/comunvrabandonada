import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  AUTH_MIGRATION,
  createDisposableResetCompatibilityPatch,
} from "./run-pauta-action-cycle-local-reset.mjs";

test("compatibilidade transitória troca somente um lookup inseguro", () => {
  const original = `before
where oid = 'public.handle_new_user()'::pg_catalog.regprocedure
after`;
  const patched = createDisposableResetCompatibilityPatch(original);
  assert.equal(
    patched,
    original.replace(
      "where oid = 'public.handle_new_user()'::pg_catalog.regprocedure",
      "where oid = pg_catalog.to_regprocedure('public.handle_new_user()')",
    ),
  );
});

test("migration com preflight seguro permanece idêntica", async () => {
  const original = await readFile(AUTH_MIGRATION, "utf8");
  const patched = createDisposableResetCompatibilityPatch(original);
  assert.equal(patched, original);
  assert.match(
    patched,
    /COMUN_ANONYMOUS_AUTH_PROFILE_TRIGGER_POSTFLIGHT_FAILED/,
  );
});

test("fonte ambígua ou incompatível é recusada", () => {
  assert.throws(
    () => createDisposableResetCompatibilityPatch("select 1;"),
    /COMUN_PAUTA_ACTION_CYCLE_RESET_PATCH_SOURCE_INVALID/,
  );
});

test("helper preserva restauração em finally e não toca o remoto", async () => {
  const helper = await readFile(
    "scripts/run-pauta-action-cycle-local-reset.mjs",
    "utf8",
  );
  assert.match(helper, /finally\s*{/);
  assert.match(helper, /writeFile\(AUTH_MIGRATION, original/);
  assert.match(helper, /mode === "start"/);
  assert.match(helper, /\["db", "reset", "--local", "--yes"\]/);
  assert.doesNotMatch(helper, /db push|migration up|SUPABASE_DB_URL|--linked/);
});
