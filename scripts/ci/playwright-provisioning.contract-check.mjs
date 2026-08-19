import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const action = readFileSync(
  path.join(repoRoot, ".github/actions/setup-playwright-browser/action.yml"),
  "utf8",
);
const provisioner = readFileSync(
  path.join(repoRoot, "scripts/ci/install-playwright-browser.mjs"),
  "utf8",
);
const workflows = [
  "comun-quality-performance.yml",
  "comun-experience-coherence.yml",
  "comun-core-journeys.yml",
  "comun-civic-graph.yml",
  "comun-civic-intelligence.yml",
  "comun-full-surface-migration.yml",
];

assert.match(action, /actions\/cache@v4/);
assert.match(action, /~\/\.cache\/ms-playwright/);
assert.match(action, /runner\.os/);
assert.match(action, /runner\.arch/);
assert.match(action, /steps\.playwright-version\.outputs\.version/);
assert.match(action, /hashFiles\('package-lock\.json'\)/);
assert.match(action, /install-playwright-browser\.mjs/);

assert.match(provisioner, /MAX_ATTEMPTS = 2/);
assert.match(provisioner, /COMMAND_TIMEOUT_MS = 8 \* 60 \* 1000/);
assert.match(provisioner, /COMUN_BROWSER_PROVISIONING_FAILED/);
assert.match(provisioner, /COMUN_BROWSER_PROVISIONING_GREEN/);
assert.match(provisioner, /retryableNetworkFailure/);
assert.match(provisioner, /ETIMEDOUT/);
assert.match(provisioner, /detached: process\.platform !== "win32"/);
assert.match(provisioner, /execFileSync\("pgrep"/);
assert.match(provisioner, /execFileSync\("fuser"/);
assert.match(provisioner, /\/var\/lib\/apt\/lists\/lock/);
assert.match(provisioner, /terminateProcessTree/);
assert.match(provisioner, /process\.kill\(-pid/);
assert.match(provisioner, /process group did not exit cleanly/);
assert.match(provisioner, /--no-install/);

for (const workflowName of workflows) {
  const workflow = readFileSync(
    path.join(repoRoot, ".github/workflows", workflowName),
    "utf8",
  );
  assert.match(workflow, /\.github\/actions\/setup-playwright-browser\/\*\*/);
  assert.match(workflow, /scripts\/ci\/install-playwright-browser\.mjs/);
  assert.doesNotMatch(
    workflow,
    /npx playwright install(?: --with-deps)? chromium/,
  );
}

console.log("COMUN_BROWSER_PROVISIONING_CONTRACT_GREEN");
