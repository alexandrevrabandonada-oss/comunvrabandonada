import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const canonical = await readFile(
  new URL("lib/comun/canonical-editorial-pautas.ts", root),
  "utf8",
);
const spaces = await readFile(new URL("lib/pauta-spaces.ts", root), "utf8");
const page = await readFile(
  new URL("app/comun/pautas/[slug]/page.tsx", root),
  "utf8",
);
const shell = await readFile(
  new URL("components/pauta-app-shell.tsx", root),
  "utf8",
);
const miniapp = await readFile(
  new URL("components/sidewalk-miniapp-shell.tsx", root),
  "utf8",
);

assert.match(canonical, /editorial:\$\{CANONICAL_SIDEWALK_PAUTA_SLUG\}/);
assert.match(canonical, /source: "editorial_fallback"/);
assert.match(spaces, /inspectCanonicalPautaRows/);
assert.match(spaces, /queryFailed: canonical\.failed/);
assert.match(page, /modules\.length \|\| isEditorialFallback/);
assert.match(shell, /Pauta-piloto editorial em construção/);
for (const phase of [
  "entenda",
  "converse",
  "contribua",
  "construa",
  "acompanhe",
  "memoria",
]) {
  assert.match(shell, new RegExp(`id: "${phase}"`));
}
assert.match(shell, /\/comun\/mapa\/contribuir/);
assert.match(miniapp, /\/comun\/pautas\/calcadas-em-circulacao/);
assert.doesNotMatch(
  [canonical, spaces, page, shell, miniapp].join("\n"),
  /SUPABASE_SERVICE_ROLE_KEY|service_role|object_key|exact_latitude|exact_longitude/,
);

console.log("COMUN_CANONICAL_SIDEWALK_PAUTA_OK");
