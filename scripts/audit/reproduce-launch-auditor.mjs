// Independent local reproduction; not the missing external package's test suite.
import assert from "node:assert/strict";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
const blob = "9b3f2c467a91cedeba2da31bd647f2f8a16b9759";
const source = execFileSync("git", ["cat-file", "blob", blob]);
assert.equal(
  crypto
    .createHash("sha1")
    .update(`blob ${source.length}\0`)
    .update(source)
    .digest("hex"),
  blob,
);
const paths = {
  "/comun": "COMUN",
  "/comun/pautas": "Pautas",
  "/comun/comunidades": "Comunidades",
  "/comun/participar": "Participar",
  "/comun/calcadas": "Mapa comunitário",
  "/comun/acervo": "Acervo",
  "/comun/radio": "Rádio",
  "/comun/observatorios": "Observatórios",
  "/comun/seguranca": "Segurança",
};
async function run(overrides = {}) {
  const writes = [];
  const context = vm.createContext({
    URL,
    Date,
    console: { log() {} },
    process: {
      env: {
        COMUN_PUBLIC_BASE_URL: "http://127.0.0.1:3999",
        COMUN_ARTIFACT_DIR: "/synthetic",
      },
    },
    fetch: async (input) => {
      const url = new URL(input);
      assert.equal(url.origin, "http://127.0.0.1:3999");
      return {
        status: 200,
        url: url.pathname.startsWith("/comun/admin/")
          ? "http://127.0.0.1:3999/comun/admin/login"
          : url.href,
        headers: new Map([
          ["strict-transport-security", "max-age=1"],
          ["x-content-type-options", "nosniff"],
          ["x-frame-options", "DENY"],
          ["referrer-policy", "same-origin"],
          ["content-security-policy", "default-src 'self'"],
        ]),
        text: async () =>
          overrides[url.pathname] ??
          `<h1>${paths[url.pathname] ?? "asset"}</h1>`,
      };
    },
  });
  const auditorModule = new vm.SourceTextModule(source.toString(), { context });
  await auditorModule.link((spec) => {
    const exports =
      spec === "node:fs/promises"
        ? {
            mkdir: async () => {},
            writeFile: async (p, b) => writes.push([p, b]),
          }
        : spec === "node:path"
          ? { resolve: (...p) => p.join("/") }
          : {
              COMUN_V1_LAUNCH_PROGRAM: {
                version: "synthetic",
                domains: [{ id: "synthetic", status: "green" }],
                finalHumanGate: "not_authorized",
              },
              summarizeComunLaunchProgram: () => ({
                readyForFinalHumanGate: true,
                counts: { green: 1 },
                total: 1,
              }),
            };
    return new vm.SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [k, v] of Object.entries(exports)) this.setExport(k, v);
      },
      { context },
    );
  });
  await auditorModule.evaluate();
  return JSON.parse(writes.find(([p]) => p.endsWith(".json"))[1]);
}
const route = (r) =>
  r.publicRoutes.find((p) => p.path === "/comun/comunidades");
const cases = [
  ["baseline synthetic", {}, (r) => assert.equal(r.findingsCount, 0)],
  [
    "input placeholder false positive",
    {
      "/comun/comunidades": '<h1>Comunidades</h1><input placeholder="Buscar">',
    },
    (r) => assert.ok(route(r).forbiddenMarkers.includes("placeholder")),
  ],
  [
    "CSS placeholder false positive",
    {
      "/comun/comunidades":
        '<h1 class="placeholder:text-gray">Comunidades</h1>',
    },
    (r) => assert.ok(route(r).forbiddenMarkers.includes("placeholder")),
  ],
  [
    "technical fixture explanation false positive",
    {
      "/comun/comunidades":
        "<h1>Comunidades</h1><p>Verificações técnicas usam fixtures descartáveis.</p>",
    },
    (r) => assert.ok(route(r).forbiddenMarkers.includes("fixture")),
  ],
  [
    "valid editorial security heading rejected",
    { "/comun/seguranca": "<h1>Como o COMUN protege relatos</h1>" },
    (r) =>
      assert.equal(
        r.publicRoutes.find((p) => p.path === "/comun/seguranca")
          .contractPresent,
        false,
      ),
  ],
  [
    "script-only contract false negative",
    {
      "/comun/comunidades":
        '<script>"Comunidades"</script><h1>Outra página</h1>',
    },
    (r) => assert.equal(route(r).contractPresent, true),
  ],
  [
    "HTML entity contract false positive",
    { "/comun/radio": "<h1>R&#225;dio</h1>" },
    (r) =>
      assert.equal(
        r.publicRoutes.find((p) => p.path === "/comun/radio").contractPresent,
        false,
      ),
  ],
  [
    "HTML robots accepted",
    { "/robots.txt": "<html>not robots</html>" },
    (r) => assert.ok(!r.findings.includes("public_asset:robots")),
  ],
  [
    "HTML sitemap accepted",
    { "/sitemap.xml": "<html>not XML sitemap</html>" },
    (r) => assert.ok(!r.findings.includes("public_asset:sitemap")),
  ],
  [
    "declared green without operational proof",
    {},
    (r) => assert.equal(r.readyForFinalHumanGate, true),
  ],
];
for (const [name, overrides, check] of cases) {
  check(await run(overrides));
  console.log(`REPRODUCED_CURRENT_BEHAVIOR ${name}`);
}
console.log(
  JSON.stringify({
    blob,
    cases: cases.length,
    network: "synthetic VM only",
    writes: "memory only",
    meaning:
      "Reproduction of original defects, not approval of corrected behavior or product",
  }),
);
