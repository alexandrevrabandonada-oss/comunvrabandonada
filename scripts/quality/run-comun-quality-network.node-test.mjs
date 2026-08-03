import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classifyNetworkRun } from "./run-comun-quality-network.mjs";

test("classifica crash do browser sem mascarar a falha", () => {
  assert.equal(
    classifyNetworkRun({
      exitCode: 1,
      signal: "SIGSEGV",
      browserCrash: true,
    }),
    "browser_process_crash",
  );
  assert.equal(
    classifyNetworkRun({ exitCode: 1, signal: null, browserCrash: false }),
    "functional_failure",
  );
  assert.equal(
    classifyNetworkRun({ exitCode: 0, signal: null, browserCrash: false }),
    "green",
  );
});

test("runner usa configuração focal, um projeto e nenhum retry", async () => {
  const [config, packageJson, workflow] = await Promise.all([
    readFile("playwright.quality-network.config.ts", "utf8"),
    readFile("package.json", "utf8"),
    readFile(".github/workflows/comun-quality-performance.yml", "utf8"),
  ]);
  assert.match(config, /grep: \/@network\//);
  assert.match(config, /workers: 1/);
  assert.match(config, /retries: 0/);
  assert.match(config, /name: "320x568-low-android"/);
  assert.match(config, /browserName: "chromium"/);
  assert.match(config, /serviceWorkers: "allow"/);
  assert.equal((config.match(/name: "320x568-low-android"/g) ?? []).length, 1);
  assert.match(
    packageJson,
    /"quality:network": "node scripts\/quality\/run-comun-quality-network\.mjs"/,
  );
  assert.match(workflow, /COMUN_QUALITY_NETWORK_SHA/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});
