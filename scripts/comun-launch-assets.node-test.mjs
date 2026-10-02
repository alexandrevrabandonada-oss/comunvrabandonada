import assert from "node:assert/strict";
import test from "node:test";
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
