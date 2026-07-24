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
assert.match(actions, /\.is\("failure_code", null\)/);
assert.match(actions, /failure_code: "confirming"/);
assert.doesNotMatch(moderation, /approve_exact/);
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
