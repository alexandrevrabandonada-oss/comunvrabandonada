import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import shp from "shpjs";

const work = path.join(process.cwd(), ".map-build", "volta-redonda", "sources");
await mkdir(work, { recursive: true });
const osmUrl = "https://overpass.kumi.systems/api/interpreter";
const ibgeUrl =
  "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/RJ/RJ_Municipios_2024.zip";
const query =
  "[out:json][timeout:180];(way[highway](-22.60,-44.22,-22.43,-43.98);way[building](-22.60,-44.22,-22.43,-43.98);way[waterway](-22.60,-44.22,-22.43,-43.98);way[natural=water](-22.60,-44.22,-22.43,-43.98);way[railway](-22.60,-44.22,-22.43,-43.98);way[leisure=park](-22.60,-44.22,-22.43,-43.98);nwr[amenity](-22.60,-44.22,-22.43,-43.98););out body;>;out skel qt;";
async function fetchBytes(url, init) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
const osmRaw = await fetchBytes(osmUrl, {
  method: "POST",
  headers: {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": "COMUN-VR-Abandonada-local-map-build/39.1",
  },
  body: new URLSearchParams({ data: query }),
});
const overpass = JSON.parse(osmRaw),
  nodes = new Map(
    overpass.elements
      .filter((x) => x.type === "node")
      .map((x) => [x.id, [x.lon, x.lat]]),
  );
const features = [];
for (const element of overpass.elements) {
  const properties = {
    ...(element.tags || {}),
    osm_id: `${element.type}/${element.id}`,
  };
  if (element.type === "node" && element.tags)
    features.push({
      type: "Feature",
      properties,
      geometry: { type: "Point", coordinates: [element.lon, element.lat] },
    });
  if (element.type === "way" && element.tags) {
    const coordinates = (element.nodes || [])
      .map((id) => nodes.get(id))
      .filter(Boolean);
    if (coordinates.length < 2) continue;
    const closed =
        coordinates.length > 3 &&
        coordinates[0][0] === coordinates.at(-1)[0] &&
        coordinates[0][1] === coordinates.at(-1)[1],
      area =
        closed &&
        (properties.building ||
          properties.landuse ||
          properties.leisure ||
          properties.natural === "water" ||
          properties.water);
    features.push({
      type: "Feature",
      properties,
      geometry: area
        ? { type: "Polygon", coordinates: [coordinates] }
        : { type: "LineString", coordinates },
    });
  }
}
const osmGeo = {
  type: "FeatureCollection",
  name: "OpenStreetMap Volta Redonda",
  features,
};
const ibgeZip = await fetchBytes(ibgeUrl),
  all = await shp(ibgeZip),
  collections = Array.isArray(all) ? all : [all],
  municipal = collections
    .flatMap((x) => x.features || [])
    .find(
      (f) =>
        String(f.properties?.CD_MUN || f.properties?.CD_GEOCMU) === "3306305",
    );
if (!municipal)
  throw new Error(
    "Limite de Volta Redonda (3306305) não encontrado no produto IBGE.",
  );
const boundary = {
  type: "FeatureCollection",
  name: "IBGE Volta Redonda 2024",
  features: [municipal],
};
const osmPath = path.join(work, "openstreetmap-volta-redonda.geojson"),
  ibgePath = path.join(work, "ibge-volta-redonda-2024.geojson");
await writeFile(osmPath, JSON.stringify(osmGeo));
await writeFile(ibgePath, JSON.stringify(boundary));
const downloadedAt = new Date().toISOString(),
  manifest = {
    downloadedAt,
    sources: {
      osm: {
        url: osmUrl,
        query,
        license: "ODbL 1.0",
        attribution: "© OpenStreetMap contributors",
        format: "Overpass JSON → GeoJSON",
        projection: "EPSG:4326",
        sizeBytes: osmRaw.length,
        sourceSha256: createHash("sha256").update(osmRaw).digest("hex"),
        output: osmPath,
        outputSha256: createHash("sha256")
          .update(await readFile(osmPath))
          .digest("hex"),
        featureCount: features.length,
      },
      ibge: {
        url: ibgeUrl,
        baseDate: "2024",
        license:
          "Dados públicos disponibilizados pelo IBGE; observar metadados do produto",
        attribution: "IBGE",
        format: "Shapefile ZIP → GeoJSON",
        projection: "EPSG:4326",
        sizeBytes: ibgeZip.length,
        sourceSha256: createHash("sha256").update(ibgeZip).digest("hex"),
        output: ibgePath,
        outputSha256: createHash("sha256")
          .update(await readFile(ibgePath))
          .digest("hex"),
        featureCount: 1,
      },
    },
  };
await writeFile(
  path.join(work, "download-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      status: "COMUN_MAP_SOURCES_READY",
      downloadedAt,
      osmFeatures: features.length,
      osmBytes: osmRaw.length,
      ibgeBytes: ibgeZip.length,
    },
    null,
    2,
  ),
);
