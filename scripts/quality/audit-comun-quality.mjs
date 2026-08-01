import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
const [
  serviceWorker,
  pwa,
  vitals,
  api,
  migration,
  manifest,
  budgets,
  packageJson,
  help,
  date,
  workflow,
] = await Promise.all([
  read("public/sw.js"),
  read("lib/comun-pwa.ts"),
  read("components/comun-web-vitals.tsx"),
  read("app/api/comun/quality-metrics/route.ts"),
  read(
    "supabase/migrations/20260731231411_comun_quality_performance_observability.sql",
  ),
  read("app/manifest.ts"),
  read("config/comun-quality-budgets.json"),
  read("package.json"),
  read("app/comun/ajuda/page.tsx"),
  read("lib/comun-date.ts"),
  read(".github/workflows/comun-quality-performance.yml"),
]);

const checks = {
  serviceWorkerV2: serviceWorker.includes('const VERSION = "comun-pwa-v2"'),
  cacheRejectsQueries:
    serviceWorker.includes("!url.search") &&
    serviceWorker.includes("!url.hash"),
  cacheRejectsMutations: serviceWorker.includes('request.method !== "GET"'),
  cacheRejectsPrivateHeaders:
    serviceWorker.includes('cacheControl.includes("private")') &&
    serviceWorker.includes('cacheControl.includes("no-store")'),
  logoutClearsContent:
    serviceWorker.includes('type === "CLEAR_CONTENT_CACHES"') &&
    serviceWorker.includes("key !== SHELL_CACHE"),
  publicRouteAllowlist:
    pwa.includes("COMUN_PUBLIC_OFFLINE_PREFIXES") &&
    !pwa.includes('"/comun/buscar"'),
  vitalsSmallBoundary:
    vitals.length < 3500 && vitals.includes("useReportWebVitals"),
  vitalsRouteClassOnly:
    vitals.includes("routeClass: classifyComunRoute(pathname)") &&
    vitals.includes("appVersion: appVersion.slice(0, 40)"),
  metricsRejectUnknownFields: api.includes(".strict()"),
  metricsAggregateOnly:
    migration.includes("comun_quality_metrics_hourly") &&
    migration.includes("value_bucket"),
  metricsRls:
    migration.includes("enable row level security") &&
    migration.includes("revoke all on table"),
  metricsServerWriteOnly:
    migration.includes("COMUN_QUALITY_SERVER_ROLE_REQUIRED") &&
    migration.includes("grant execute") &&
    !migration.includes("to anon"),
  manifestCanonical:
    manifest.includes('id: "/comun/"') &&
    manifest.includes('scope: "/comun/"') &&
    manifest.includes('display: "standalone"') &&
    manifest.includes('purpose: "maskable"'),
  fourBudgets:
    Object.keys(JSON.parse(budgets)).sort().join(",") ===
    "media,rich,simple,visual",
  helpCanonical:
    help.includes("Ajuda para seguir sem se perder") &&
    help.includes("/comun/offline"),
  deterministicDate: date.includes("timeZone: COMUN_TIME_ZONE"),
  disposableSidewalkLedgerExact:
    workflow.includes("--adopt-local-validation-ledger") &&
    workflow.includes(
      "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json",
    ) &&
    workflow.includes(
      "COMUN_SIDEWALK_OPERATIONAL_V2=enabled npm run test:e2e:comun-calcadas-operacional",
    ) &&
    workflow.includes(
      "COMUN_SIDEWALK_OPERATIONAL_V2=enabled npm run test:a11y:comun-calcadas-operacional",
    ),
  postcssPatched:
    Number(JSON.parse(packageJson).devDependencies.postcss.split(".").at(-1)) >=
    17,
};
for (const [name, passed] of Object.entries(checks))
  assert.equal(passed, true, `quality contract failed: ${name}`);

const report = {
  schemaVersion: 1,
  result: "COMUN_QUALITY_AUTOMATED_CONTRACT_GREEN",
  privacy: "aggregate_only",
  checks,
  blockersOutsideAutomation: [
    "physical_android",
    "second_physical_platform",
    "real_assistive_technology",
    "field_sample",
  ],
};
if (process.argv.includes("--write-report")) {
  const target = path.join(
    root,
    "reports/generated/comun-quality-contract.json",
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
}
console.log(JSON.stringify(report));
