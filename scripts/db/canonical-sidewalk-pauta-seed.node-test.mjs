import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260729221500_restore_canonical_sidewalk_pauta.sql";

test("canonical sidewalk pauta repair is idempotent and contains no destructive SQL", async () => {
  const sql = await readFile(migrationPath, "utf8");
  assert.match(sql, /^begin;/);
  assert.match(sql, /insert into public\.comun_pauta_spaces/i);
  assert.match(sql, /'calcadas-em-circulacao'/);
  assert.match(sql, /on conflict \(slug\) do nothing/i);
  assert.match(sql, /COMUN_SIDEWALK_CANONICAL_PAUTA_NOT_RESTORED/);
  assert.match(sql, /commit;\s*$/);
  assert.doesNotMatch(sql, /\b(delete|truncate|drop|alter)\b/i);
});

test("upload authorization checks the canonical pauta before creating a ticket", async () => {
  const source = await readFile("app/comun/mapa/contribuir/actions.ts", "utf8");
  const pautaCheck = source.indexOf('.from("comun_pauta_spaces")');
  const uploadInsert = source.indexOf('.from("comun_sidewalk_uploads").insert');
  assert.notEqual(pautaCheck, -1);
  assert.notEqual(uploadInsert, -1);
  assert.ok(pautaCheck < uploadInsert);
  assert.match(source, /CANONICAL_SIDEWALK_PAUTA_SLUG/);
});

test("direct Supabase upload compensation removes from the bucket that issued the signed URL", async () => {
  const source = await readFile("app/comun/mapa/contribuir/actions.ts", "utf8");
  const compensation = source.slice(
    source.indexOf("async function compensatePartialSidewalkUpload"),
    source.indexOf("type SidewalkUploadAuthorization"),
  );
  assert.match(compensation, /db\.storage/);
  assert.match(compensation, /\.from\("archive-private-originals"\)/);
  assert.match(compensation, /\.remove\(\[objectKey\]\)/);
  assert.doesNotMatch(compensation, /getMediaStorage\(\)\.removeObject/);
  assert.match(source, /status: "abandoned"/);
  assert.match(source, /confirmation_state: "abandoned"/);
});

test("expected authorization failures are returned safely to the mobile form", async () => {
  const action = await readFile("app/comun/mapa/contribuir/actions.ts", "utf8");
  const form = await readFile(
    "components/sidewalk-first-participation-form.tsx",
    "utf8",
  );
  assert.match(action, /safeUploadAuthorizationMessages/);
  assert.match(action, /\{ ok: false; error: string \}/);
  assert.match(form, /if \(!authorization\.ok\)/);
  assert.match(form, /throw new Error\(authorization\.error\)/);
});

test("operational migration and manifest remain canonical", async () => {
  const migration = await readFile(
    "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql",
  );
  const manifest = await readFile(
    "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json",
  );
  assert.equal(
    createHash("sha256").update(migration).digest("hex"),
    "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be",
  );
  assert.equal(
    createHash("sha256").update(manifest).digest("hex"),
    "ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335",
  );
});
