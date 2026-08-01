import assert from "node:assert/strict";

const base = new URL(
  process.env.COMUN_BASE_URL ?? "https://comunsocial.online",
);
assert.equal(base.protocol, "https:");
const qualityStatusResponse = await fetch(
  new URL("/api/comun/quality-status", base),
  { cache: "no-store" },
);
assert.equal(qualityStatusResponse.status, 200);
const qualityStatus = await qualityStatusResponse.json();
assert.equal(qualityStatus.serviceWorker, "comun-pwa-v2");
assert.equal(qualityStatus.telemetry, "aggregate_only");
if (process.env.COMUN_EXPECTED_SHA)
  assert.equal(qualityStatus.version, process.env.COMUN_EXPECTED_SHA);
const checks = [];
for (const [name, route] of [
  ["home", "/comun"],
  ["help", "/comun/ajuda"],
  ["search", "/comun/buscar?q=calcadas"],
  ["security", "/comun/seguranca"],
  ["offline", "/comun/offline"],
  ["login", "/comun/entrar"],
]) {
  const response = await fetch(new URL(route, base), { redirect: "manual" });
  assert.equal(response.status, 200, name);
  const html = await response.text();
  assert.ok(
    !/SUPABASE_SERVICE_ROLE_KEY|BEGIN PRIVATE KEY|postgres(?:ql)?:\/\//i.test(
      html,
    ),
    `${name}: leak marker`,
  );
  checks.push({ route: name, status: response.status });
}
const protectedResponse = await fetch(
  new URL("/comun/admin/observabilidade", base),
  { redirect: "manual" },
);
assert.ok([302, 303, 307, 308].includes(protectedResponse.status));
const [manifest, serviceWorker] = await Promise.all([
  fetch(new URL("/manifest.webmanifest", base)),
  fetch(new URL("/sw.js", base)),
]);
assert.equal(manifest.status, 200);
assert.equal(serviceWorker.status, 200);
assert.equal((await manifest.json()).scope, "/comun/");
assert.match(await serviceWorker.text(), /comun-pwa-v2/);
const invalidMetric = await fetch(new URL("/api/comun/quality-metrics", base), {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base.origin },
  body: JSON.stringify({
    name: "LCP",
    value: 1,
    rating: "good",
    routeClass: "home",
    deviceClass: "mobile",
    appVersion: "synthetic",
    rawPath: "/must-not-be-accepted",
  }),
});
assert.equal(invalidMetric.status, 400);
console.log(
  JSON.stringify({
    result: "COMUN_QUALITY_REMOTE_READ_ONLY_REHEARSAL_GREEN",
    versionMatched: Boolean(process.env.COMUN_EXPECTED_SHA),
    checks,
    protectedSurface: "redirected",
    invalidTelemetryField: "rejected",
    syntheticAccountMutation: "not_performed",
    cleanup: "not_required",
  }),
);
