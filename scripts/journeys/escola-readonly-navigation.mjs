import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect } from "@playwright/test";

const base = "https://comunsocial.online";
const expected = "041f6b17a49286249fb8290428b7422695a87937";
const directory = ".ci-artifacts/escola-readonly-navigation";
mkdirSync(directory, { recursive: true });
const evidence = {
  status: "RUNNING",
  runSha: process.env.GITHUB_SHA,
  workflowRunId: process.env.GITHUB_RUN_ID,
  expectedServedSha: expected,
  servedSha: null,
  credentialsProvided: false,
  serviceWorkers: "blocked_for_write_interception",
  viewport: { width: 1280, height: 800 },
  expectationTimeoutMs: 5000,
  executedWrites: 0,
  attemptedNonReadRequests: 0,
  browserErrors: 0,
  cases: [],
  originalPostmergeGateCertified: false,
};
const browser = await chromium.launch({ channel: "chromium" });
try {
  for (const name of [
    "mobile-320x568",
    "mobile-390x844",
    "landscape-844x390",
    "tablet-768x1024",
    "pwa-standalone-430x932",
  ]) {
    const context = await browser.newContext({
      viewport: evidence.viewport,
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      if (!["GET", "HEAD"].includes(route.request().method())) {
        evidence.attemptedNonReadRequests += 1;
        return route.abort("blockedbyclient");
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.on("pageerror", () => {
      evidence.browserErrors += 1;
    });
    const record = { project: name, result: "NOT_RUN" };
    evidence.cases.push(record);
    let stage = "served-sha";
    try {
      const status = await page.request.get(base + "/api/comun/quality-status");
      assert.equal(status.status(), 200);
      evidence.servedSha = (await status.json()).version;
      assert.equal(evidence.servedSha, expected, "SERVED_SHA_DRIFT");
      stage = "public-page";
      await page.goto(base + "/comun?experiencia=app-v2");
      const link = page.getByRole("link", {
        name: /participar do que está acontecendo/i,
      });
      assert.equal(
        await link.getAttribute("href"),
        "/comun/pautas",
        "PARTICIPAR_LINK_CONTRACT_DRIFT",
      );
      const started = Date.now();
      stage = "link-click";
      await link.click();
      stage = "navigation";
      await expect(page).toHaveURL(/\/comun\/pautas/, { timeout: 5000 });
      stage = "heading";
      await expect(
        page.getByRole("heading", { name: /pautas/i }),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      record.result = "PASS";
      record.navigationMs = Date.now() - started;
    } catch (error) {
      record.result = "FAIL";
      record.failedStage = stage;
      record.errorKind = /strict mode violation/.test(error.message)
        ? "STRICT_MODE_VIOLATION"
        : /Timeout|timed out/.test(error.message)
          ? "TIMEOUT"
          : "ASSERTION_OR_BROWSER_FAILURE";
      record.marker =
        evidence.servedSha !== expected
          ? "SERVED_SHA_DRIFT"
          : "PUBLIC_NAVIGATION_CONTRACT_UNPROVEN";
    } finally {
      await context.close();
    }
  }
  evidence.status = evidence.cases.every((item) => item.result === "PASS")
    ? "PUBLIC_READONLY_NAVIGATION_DIAGNOSTIC_PASS"
    : "PUBLIC_READONLY_NAVIGATION_DIAGNOSTIC_FAIL";
} finally {
  await browser.close();
  writeFileSync(
    directory + "/proof.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
}
console.log(JSON.stringify(evidence));
if (evidence.status !== "PUBLIC_READONLY_NAVIGATION_DIAGNOSTIC_PASS") {
  process.exitCode = 1;
}
