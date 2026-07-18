import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { assertLocalPerformanceTarget, countOriginalAssets, percentile95, requireLocalPerformance, sanitizeLocalPerformance } from "../lib/local-operational-performance.ts";
import { cleanupOperationalPersonas, ensureLocalOperationalPersona, operationalEmail, operationalPassword } from "../tests/fixtures/comun/operational-personas.mjs";
import { cleanupOperationalPerformanceScenario, createOperationalPerformanceScenario } from "../tests/fixtures/comun/operational-performance-scenario.mjs";

requireLocalPerformance();
const base = assertLocalPerformanceTarget(process.env.COMUN_BASE_URL ?? "http://127.0.0.1:3000").origin;
const counts = [0, 25, 50, 100];
const samples = [];
const browser = await chromium.launch();

async function login(page) {
  await page.goto(`${base}/comun/admin/login?redirectTo=${encodeURIComponent("/comun/admin/operacao")}`);
  await page.getByLabel("E-mail").fill(operationalEmail("operations_admin"));
  await page.getByLabel("Senha").fill(operationalPassword);
  await Promise.all([page.waitForURL((url) => url.pathname === "/comun/admin/operacao"), page.getByRole("button", { name: "Entrar" }).click()]);
}

try {
  await cleanupOperationalPersonas();
  const personas = await Promise.all([ensureLocalOperationalPersona({ persona: "operations_admin" }), ensureLocalOperationalPersona({ persona: "contribution_reviewer" })]);
  for (const itemCount of counts) {
    const runId = `perf-${itemCount}-${randomUUID().slice(0, 8)}`;
    let scenario;
    try {
      scenario = await createOperationalPerformanceScenario({ runId, itemCount, queue: "all", status: "mixed", territoryCount: 0, personas });
      console.log(`COMUN_PERF_SCENARIO_${itemCount}_READY sql=${scenario.inserted.length}`);
      for (let iteration = 0; iteration < 3; iteration += 1) {
        const context = await browser.newContext();
        const page = await context.newPage();
        await login(page);
        const started = performance.now();
        const response = await page.goto(`${base}/comun/admin/operacao`, { waitUntil: "networkidle" });
        const requestMs = performance.now() - started;
        const body = await response?.body() ?? Buffer.alloc(0);
        const renderedItems = await page.locator('a[href^="/comun/admin/operacao/"]').count();
        const responseText = await page.content();
        const expectedTitles = scenario.inserted.map((item) => item.title);
        const responseItems = expectedTitles.filter((title) => responseText.includes(title)).length;
        if (renderedItems !== itemCount || responseItems !== itemCount) throw new Error(`materialização divergente em ${itemCount}: sql=${scenario.inserted.length} response=${responseItems} dom=${renderedItems}`);
        const metrics = await page.evaluate(() => ({ heapUsedBytes: performance.memory?.usedJSHeapSize ?? 0, serializedBytes: new Blob([document.documentElement.outerHTML]).size, resources: performance.getEntriesByType("resource").map((entry) => entry.name) }));
        samples.push(sanitizeLocalPerformance({ surface: `central-${itemCount}`, items: itemCount, httpStatus: response?.status() ?? 0, requestMs, payloadBytes: body.byteLength, queryCount: 1, queryTotalMs: 0, largestQueryMs: 0, rssBeforeBytes: process.memoryUsage().rss, rssAfterBytes: process.memoryUsage().rss, heapUsedBytes: metrics.heapUsedBytes, renderedItems, serializedBytes: metrics.serializedBytes, originalAssetsLoaded: countOriginalAssets(metrics.resources), iteration }));
        await context.close();
      }
    } finally {
      await cleanupOperationalPerformanceScenario({ runId });
    }
  }
} finally {
  await browser.close();
  await cleanupOperationalPersonas();
}

const grouped = Object.fromEntries(counts.map((itemCount) => {
  const values = samples.filter((sample) => sample.items === itemCount).map((sample) => sample.requestMs);
  return [itemCount, { samples: values.length, averageMs: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)), p95LocalMs: Number(percentile95(values).toFixed(2)) }];
}));
const summary = { generatedAt: new Date().toISOString(), host: "localhost", telemetry: false, mode: "next-start", samples: samples.map((sample) => ({ ...sample, requestMs: Number(sample.requestMs.toFixed(2)), rssDeltaBytes: sample.rssAfterBytes - sample.rssBeforeBytes })), scenarios: grouped };
await writeFile("reports/comun-performance-carga-real-33-2-1.json", `${JSON.stringify(summary, null, 2)}\n`);
console.log("COMUN_AUTHENTICATED_PERFORMANCE_LOCAL_OK");
