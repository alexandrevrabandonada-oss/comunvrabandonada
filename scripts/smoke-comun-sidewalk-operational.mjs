import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const [capture, actions, moderation, map, loop, participation] =
  await Promise.all([
    read("components/sidewalk-first-participation-form.tsx"),
    read("app/comun/mapa/contribuir/actions.ts"),
    read("app/comun/admin/calcadas/actions.ts"),
    read("components/sidewalk-real-map.tsx"),
    read("lib/sidewalk-operational-loop.ts"),
    read("lib/pauta-miniapps.ts"),
  ]);

assert.match(capture, /consent_publish/);
assert.match(capture, /Conferi fotografia, local, condição e impacto/);
assert.match(actions, /confirmation_locked_at/);
assert.match(actions, /failed_retryable/);
assert.match(actions, /compensatePartialSidewalkUpload/);
assert.match(actions, /removeObject\("private_original", objectKey\)/);
assert.match(actions, /private_notes: description/);
assert.match(actions, /public_summary: null/);
assert.match(capture, /ArrowLeft/);
assert.match(capture, /manual-point-help/);
assert.doesNotMatch(moderation, /approve_exact/);
assert.match(moderation, /resumo público sanitizado/i);
assert.match(moderation, /complement_request/);
for (const filter of ["problema", "bairro", "estado", "verificacao", "periodo"])
  assert.match(map, new RegExp(filter));
assert.match(loop, /duplicateSignalScore/);
assert.match(loop, /projectSidewalkOperationalState/);
assert.match(participation, /action_url/);

const publicSurface = [map, loop, participation].join("\n");
assert.doesNotMatch(
  publicSurface,
  /SUPABASE_SERVICE_ROLE_KEY|service_role|private_geometry_geojson|object_key|private_notes/,
);

console.log("COMUN_CALCADAS_OPERATIONAL_OK");
