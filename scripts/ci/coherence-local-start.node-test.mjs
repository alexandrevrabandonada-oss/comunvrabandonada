import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";
import { createHash } from "node:crypto";

const startHelper = readFileSync(
  new URL("../../scripts/run-pauta-action-cycle-local-reset.mjs", import.meta.url),
  "utf8",
);
const workflow = readFileSync(
  new URL(
    "../../.github/workflows/comun-experience-coherence.yml",
    import.meta.url,
  ),
  "utf8",
);

// The old CLI can retain stale Kong upstream addresses after db reset.
// v2.113.0's native TS reset reloads Kong before seeding buckets:
// https://github.com/supabase/cli/blob/v2.113.0/apps/cli/src/legacy/shared/db-bootstrap/restart-services.ts
function verifyLocalResetContract(source) {
  assert.match(
    source,
    /uses: supabase\/setup-cli@v1\s+with:\s+version: 2\.113\.0\b/,
  );
  assert.match(source, /timeout-minutes: 45/);
  assert.doesNotMatch(
    source,
    /continue-on-error|--linked|--db-url|--ignore-health-check/,
  );
  const start = source.indexOf(
    "node scripts/run-pauta-action-cycle-local-reset.mjs start",
  );
  const reset = source.indexOf(
    "node scripts/run-pauta-action-cycle-local-reset.mjs reset",
  );
  const browser = source.indexOf("npm run test:e2e:experience-coherence");
  assert.ok(start >= 0 && reset > start && browser > reset);
  assert.equal(source.match(/local-reset\.mjs reset/g)?.length, 2);
  assert.match(startHelper, /\["start", "-x", "edge-runtime"\]/);
  assert.doesNotMatch(startHelper, /--ignore-health-check|continue-on-error/);
  assert.match(
    source,
    /if \(\(reset_status != 0\)\) && grep -q "Error status 502"/,
  );
  assert.match(source, /exit "\$reset_status"/);
  assert.match(source, /npm run build/);
}

test("certified CLI keeps local start, reset, bounded retry and downstream gates", () => {
  verifyLocalResetContract(workflow);
});

test("rejects the pre-Kong-reload CLI", () => {
  assert.throws(() =>
    verifyLocalResetContract(workflow.replace("2.113.0", "2.109.1")),
  );
});

test("rejects remote reset, skipped health checks and swallowed errors", () => {
  for (const forbidden of [
    "--linked",
    "--db-url",
    "--ignore-health-check",
    "continue-on-error: true",
  ]) {
    assert.throws(() => verifyLocalResetContract(`${workflow}\n${forbidden}`));
  }
});

test("rejects an extra reset retry or lost error propagation", () => {
  assert.throws(() =>
    verifyLocalResetContract(`${workflow}\nlocal-reset.mjs reset`),
  );
  assert.throws(() =>
    verifyLocalResetContract(workflow.replace('exit "$reset_status"', "true")),
  );
});

const quality = load(
  readFileSync(
    new URL(
      "../../.github/workflows/comun-quality-performance.yml",
      import.meta.url,
    ),
    "utf8",
  ),
);
function verifyQualityResetToolchain(config) {
  const resetHashes = {
    "pr-lane":
      "d1cb3fdc12f25b0f7669fb18bcf8adbb57724321f2ae36f0b6620f1510acd5f8",
    "territory-local-only-contract":
      "a38fcf71a2685d6345d1ea6bdb2a35a6c37b9cd5d22e569f33d157ec72244d9f",
    "territory-p1t-local-contract":
      "c407c9573e07f489a89390b7168f63d7910edaf3d5d56ed12f596559e90f04ac",
  };
  for (const id of [
    "pr-lane",
    "territory-local-only-contract",
    "territory-p1t-local-contract",
  ]) {
    const job = config.jobs[id];
    const setup = job.steps.find(
      (step) => step.uses === "supabase/setup-cli@v1",
    );
    assert.equal(setup.with.version, "2.113.0", id);
    const resets = job.steps.filter((step) =>
      step.run?.includes("supabase db reset --local --yes"),
    );
    assert.equal(resets.length, 1, id);
    for (const step of resets) {
      assert.equal(
        createHash("sha256").update(step.run).digest("hex"),
        resetHashes[id],
      );
      assert.doesNotMatch(step.run, /--linked|--db-url|--ignore-health-check/);
      assert.notEqual(step["continue-on-error"], true);
    }
  }
  const main = config.jobs["pr-lane"];
  assert.equal(main["timeout-minutes"], 110);
  const commands = main.steps.map((step) => step.run || "").join("\n");
  for (const command of [
    "npm run audit:rls-matrix",
    "npm run build",
    "npm run quality:a11y",
    "npm run quality:pwa",
    "npm run test:e2e:comun-integral-experience",
    "npm run test:e2e:experience-coherence",
  ])
    assert.ok(commands.includes(command), command);
}

test("Quality local reset lanes use the Kong fix and retain health and product gates", () => {
  verifyQualityResetToolchain(quality);
});

test("Quality refuses old toolchain or a weakened local reset", () => {
  for (const id of [
    "pr-lane",
    "territory-local-only-contract",
    "territory-p1t-local-contract",
  ]) {
    const old = structuredClone(quality);
    old.jobs[id].steps.find(
      (step) => step.uses === "supabase/setup-cli@v1",
    ).with.version = "2.111.0";
    assert.throws(() => verifyQualityResetToolchain(old));
    const unsafe = structuredClone(quality);
    unsafe.jobs[id].steps.find((step) =>
      step.run?.includes("supabase db reset --local --yes"),
    ).run += " --ignore-health-check";
    assert.throws(() => verifyQualityResetToolchain(unsafe));
  }
});
