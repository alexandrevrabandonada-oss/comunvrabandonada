import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const shell = await readFile(new URL("components/pauta-app-shell.tsx", root), "utf8");
const map = await readFile(new URL("components/sidewalk-map-module.tsx", root), "utf8");
const miniapp = await readFile(new URL("components/sidewalk-miniapp-shell.tsx", root), "utf8");
const home = await readFile(new URL("app/comun/page.tsx", root), "utf8");

for (const phase of ["entenda", "converse", "contribua", "construa", "acompanhe", "memoria"]) {
  assert.match(shell, new RegExp(`id: "${phase}"`));
}
assert.match(map, /Mapa coletivo desta pauta/);
assert.match(miniapp, /Voltar à pauta Calçadas/);
assert.match(home, /Agora no território/);
assert.doesNotMatch([shell, map, miniapp, home].join("\n"), /service_role|SUPABASE_SERVICE_ROLE_KEY/);
console.log("COMUN_NUCLEO_VIVO_LOCAL_OK");
