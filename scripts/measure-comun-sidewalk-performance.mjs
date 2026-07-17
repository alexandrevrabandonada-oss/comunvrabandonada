import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import setup from "../tests/sidewalk-pilot/global-setup.mjs";
import teardown from "../tests/sidewalk-pilot/global-teardown.mjs";
import { assertLocalEnvironment } from "./local-environment.mjs";

const base = assertLocalEnvironment();
await setup();
try {
  const fixture = JSON.parse(await readFile(".comun-sidewalk-pilot-slug", "utf8"));
  const routes = [
    ["pauta", `/comun/pautas/${fixture.slug}`],
    ["mapa-lista", `/comun/pautas/${fixture.slug}#map`],
    ["detalhe", `/comun/pautas/${fixture.slug}/registros/${fixture.recordSlug}`],
    ["contribuicao", `/comun/pautas/${fixture.slug}#construction_circle`],
    ["upload", "/comun/acervo/contribuir"],
    ["observatorio", `/comun/pautas/${fixture.slug}#observatory`],
    ["minha-participacao", "/comun/minha-participacao"],
    ["caixa-entrada", "/comun/caixa-de-entrada"],
    ["territorio", "/comun/mapa"],
    ["memoria", `/comun/pautas/${fixture.slug}/memoria/${fixture.memorySlug}`],
  ];
  for (const [name, route] of routes) {
    const times = [];
    let response;
    let bytes = 0;
    for (let run = 0; run < 3; run += 1) {
      const start = performance.now();
      response = await fetch(`${base}${route}`, { redirect: "follow" });
      const body = await response.arrayBuffer();
      times.push(Math.round(performance.now() - start));
      bytes = body.byteLength;
    }
    const average = Math.round(times.reduce((sum, value) => sum + value, 0) / times.length);
    console.log(`PERF ${name} status=${response.status} avg_ms=${average} bytes=${bytes} runs=${times.join(",")}`);
  }
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1800"><rect width="2400" height="1800" fill="#999"/></svg>');
  const rssBefore = process.memoryUsage().rss;
  const sharpStart = performance.now();
  const derivative = await sharp(svg).resize({ width: 960 }).webp({ quality: 84 }).toBuffer();
  console.log(`PERF sharp status=ok avg_ms=${Math.round(performance.now() - sharpStart)} bytes=${derivative.byteLength} rss_delta=${Math.max(0, process.memoryUsage().rss - rssBefore)}`);
} finally {
  await teardown();
}
