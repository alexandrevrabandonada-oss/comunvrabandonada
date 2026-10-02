import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  hasPilotNoindexHeader,
  inspectManifest,
  inspectPilotRobots,
  inspectPilotSitemap,
} from "./comun-launch-assets.mjs";
import { COMUN_PRIVATE_CRAWL_PATHS } from "../lib/comun-indexing-policy.ts";

const robotsBody = [
  "User-Agent: *",
  "Allow: /",
  ...COMUN_PRIVATE_CRAWL_PATHS.map((path) => `Disallow: ${path}`),
  "Sitemap: https://comunsocial.online/sitemap.xml",
].join("\n");
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
const response = (html, type, status = 200) => ({
  html,
  status,
  headers: { "content-type": type },
});

test("HTTP 200 HTML cannot masquerade as robots, XML or a manifest", () => {
  const html = response("<html><body>OK</body></html>", "text/html");
  for (const inspect of [
    inspectPilotRobots,
    inspectPilotSitemap,
    inspectManifest,
  ])
    assert.equal(inspect(html).valid, false);
});
test("pilot crawler policy lets public pages expose noindex and excludes private routes", () => {
  assert.equal(
    inspectPilotRobots(response(robotsBody, "text/plain; charset=utf-8")).valid,
    true,
  );
  for (const path of COMUN_PRIVATE_CRAWL_PATHS)
    assert.equal(
      inspectPilotRobots(
        response(robotsBody.replace(`Disallow: ${path}`, ""), "text/plain"),
      ).valid,
      false,
    );
});
test("specific allow, extra agent, foreign sitemap and HTTP errors fail closed", () => {
  for (const body of [
    `${robotsBody}\nAllow: /comun/admin/`,
    `${robotsBody}\nUser-Agent: Googlebot\nAllow: /`,
    robotsBody.replace("https://comunsocial.online", "https://other.example"),
  ])
    assert.equal(inspectPilotRobots(response(body, "text/plain")).valid, false);
  assert.equal(
    inspectPilotRobots(response(robotsBody, "text/plain", 404)).valid,
    false,
  );
});
test("empty valid pilot sitemap is distinct from launch indexing readiness", () => {
  assert.deepEqual(inspectPilotSitemap(response(xml, "application/xml")), {
    valid: true,
    reasons: [],
    submittedUrls: 0,
  });
  for (const body of [
    xml.replace(
      "</urlset>",
      "<url><loc>https://comunsocial.online/comun/admin/</loc></url></urlset>",
    ),
    xml.replace(
      "</urlset>",
      "<url><loc>https://comunsocial.online/comun/buscar?q=private</loc></url></urlset>",
    ),
    xml.replace("</urlset>", ""),
    xml.replace(
      "http://www.sitemaps.org/schemas/sitemap/0.9",
      "https://other.example",
    ),
    '<!DOCTYPE urlset SYSTEM "https://other.example/data">' + xml,
  ])
    assert.equal(
      inspectPilotSitemap(response(body, "application/xml")).valid,
      false,
    );
});
test("manifest validates JSON structure and a local public entry", () => {
  const manifest = {
    name: "COMUN",
    start_url: "/comun",
    icons: [{ src: "/icons/comun-192.png" }],
  };
  assert.equal(
    inspectManifest(
      response(JSON.stringify(manifest), "application/manifest+json"),
    ).valid,
    true,
  );
  for (const start_url of [
    "/comun-admin",
    "https://other.example/comun",
    "/comun/admin",
    "//other.example",
  ])
    assert.equal(
      inspectManifest(
        response(
          JSON.stringify({ ...manifest, start_url }),
          "application/json",
        ),
      ).valid,
      false,
    );
  assert.equal(
    inspectManifest(response("{}", "application/json")).valid,
    false,
  );
  assert.equal(inspectManifest(response("{", "application/json")).valid, false);
});
test("robots exclusions alone do not constitute noindex", () => {
  assert.equal(hasPilotNoindexHeader({}), false);
  assert.equal(hasPilotNoindexHeader({ "x-robots-tag": "noindex" }), false);
  assert.equal(
    hasPilotNoindexHeader({ "x-robots-tag": "noindex, noarchive" }),
    true,
  );
});

async function auditGate({ noindex = true, allGreen = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "comun-indexing-gate-"));
  // Only this disposable child process uses an all-green program and HTTP doubles.
  // No application files, domain evidence, deployment or database are changed.
  const code = `
    const { COMUN_V1_LAUNCH_PROGRAM } = await import('./lib/comun-launch-program.ts');
    if (${allGreen}) for (const domain of COMUN_V1_LAUNCH_PROGRAM.domains) domain.status = 'green';
    globalThis.fetch = async (url) => {
      const path = new URL(url).pathname;
      let text = '<main>COMUN Pautas Comunidades Participar Mapa comunitário Acervo Rádio Observatórios Segurança</main>';
      const headers = new Headers({
        'content-type': 'text/html', 'strict-transport-security': 'max-age=31536000',
        'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'content-security-policy': "frame-ancestors 'none'",
        ...(${noindex} ? {'x-robots-tag': 'noindex, noarchive'} : {})
      });
      if (path === '/robots.txt') { text = ${JSON.stringify(robotsBody)}; headers.set('content-type', 'text/plain'); }
      if (path === '/sitemap.xml') { text = ${JSON.stringify(xml)}; headers.set('content-type', 'application/xml'); }
      if (path === '/manifest.webmanifest') { text = JSON.stringify({name:'COMUN',start_url:'/comun',icons:[{src:'/icons/comun-192.png'}]}); headers.set('content-type', 'application/manifest+json'); }
      return { status: 200, url: path.startsWith('/comun/admin/') ? 'https://test.example/comun/admin/login' : url, headers, text: async () => text };
    };
    await import('./scripts/audit-comun-launch-readiness.mjs');
  `;
  try {
    const { stdout } = await promisify(execFile)(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module", "-e", code],
      {
        cwd: new URL("../", import.meta.url),
        env: {
          ...process.env,
          COMUN_PUBLIC_BASE_URL: "https://test.example",
          COMUN_ARTIFACT_DIR: dir,
        },
      },
    );
    return JSON.parse(stdout);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("pilot noindex permits reaching the final human gate without authorizing launch", async () => {
  const artifact = await auditGate();
  assert.equal(artifact.readyForFinalHumanGate, true);
  assert.equal(artifact.finalHumanGate, "launch_publicly");
  assert.equal(artifact.indexingPolicy, "pilot_noindex");
  assert.equal(artifact.pilotNoindexConfirmed, true);
  assert.deepEqual(artifact.findings, []);
  assert.equal(artifact.writes.deployment, "none");
});

test("missing noindex and actual unfinished domains still block the final gate", async () => {
  const missing = await auditGate({ noindex: false });
  assert.equal(missing.readyForFinalHumanGate, false);
  assert.ok(missing.findings.includes("indexing_policy:missing_pilot_noindex"));
  const actual = await auditGate({ allGreen: false });
  assert.equal(actual.readyForFinalHumanGate, false);
  assert.ok(
    actual.findings.some((value) => value.startsWith("launch_domain:")),
  );
});
