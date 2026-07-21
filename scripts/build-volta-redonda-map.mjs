import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd(),
  work = path.join(root, ".map-build", "volta-redonda"),
  out = path.join(root, "public", "maps", "volta-redonda");
const sources = {
  osm:
    process.env.COMUN_MAP_OSM_SOURCE ||
    path.join(work, "sources", "openstreetmap-volta-redonda.geojson"),
  ibge:
    process.env.COMUN_MAP_IBGE_BOUNDARY ||
    path.join(work, "sources", "ibge-volta-redonda-2024.geojson"),
};
const fail = (message) => {
  throw new Error(`[maps:build:volta-redonda] ${message}`);
};
async function obtain(value, name) {
  const target = path.join(work, `${name}.geojson`);
  if (/^https:\/\//.test(value)) {
    const response = await fetch(value);
    if (!response.ok) fail(`Falha ao baixar ${name}: HTTP ${response.status}`);
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
  } else {
    const sourcePath = path.resolve(value);
    if (sourcePath !== target) await copyFile(sourcePath, target);
  }
  const bytes = await readFile(target);
  return {
    path: target,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
await mkdir(work, { recursive: true });
await mkdir(out, { recursive: true });
const [osm, ibge] = await Promise.all([
  obtain(sources.osm, "osm"),
  obtain(sources.ibge, "ibge"),
]);
for (const source of [osm, ibge]) {
  let parsed;
  try {
    parsed = JSON.parse(source.bytes);
  } catch {
    fail(`${path.basename(source.path)} precisa ser GeoJSON válido.`);
  }
  if (!["FeatureCollection", "Feature"].includes(parsed.type))
    fail(`${path.basename(source.path)} não é uma coleção GeoJSON.`);
}
const pmtiles = path.join(out, "volta-redonda.pmtiles"),
  containerPath = (file) =>
    `/work/${path.relative(root, file).split(path.sep).join("/")}`,
  tippecanoeArgs = [
    "-o",
    containerPath(pmtiles),
    "--force",
    "--minimum-zoom=10",
    "--maximum-zoom=16",
    "--no-tile-size-limit",
    "--clip-bounding-box=-44.22,-22.60,-43.98,-22.43",
    "-L",
    `osm:${containerPath(osm.path)}`,
    "-L",
    `boundary:${containerPath(ibge.path)}`,
  ];
const dockerArgs = [
  "run",
  "--rm",
  "-v",
  `${root}:/work`,
  "-w",
  "/work",
  "comun/tippecanoe:2.79.0",
  ...tippecanoeArgs,
];
const run = spawnSync("docker", dockerArgs, {
  stdio: "inherit",
});
if (run.error?.code === "ENOENT" || run.status !== 0)
  fail(
    "A imagem Docker comun/tippecanoe:2.79.0 é obrigatória e não concluiu o build.",
  );
const built = await readFile(pmtiles);
if (built.length < 127 || built.subarray(0, 7).toString("utf8") !== "PMTiles")
  fail("Artefato PMTiles inválido ou vazio.");
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  bounds: [-44.22, -22.6, -43.98, -22.43],
  inputs: {
    osm: {
      origin: sources.osm,
      sha256: osm.sha256,
      license: "ODbL 1.0",
      attribution: "© OpenStreetMap contributors",
    },
    ibge: {
      origin: sources.ibge,
      sha256: ibge.sha256,
      license: "Dados públicos IBGE; consultar metadados do produto",
      attribution: "IBGE",
    },
  },
  transform: [
    "validação GeoJSON",
    "recorte ao bbox municipal com margem",
    "tiles vetoriais z10-z16",
    "empacotamento PMTiles",
  ],
  output: {
    file: "volta-redonda.pmtiles",
    sizeBytes: (await stat(pmtiles)).size,
    sha256: createHash("sha256").update(built).digest("hex"),
    pmtilesVersion: built[7],
    versionControl:
      "artefato ignorado; reproduzível pelo manifesto e toolchain fixa",
  },
};
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
