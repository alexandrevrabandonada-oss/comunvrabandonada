import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { load } from "js-yaml";

test("PR PWA contract tests its checked-out candidate on loopback without Production credentials", () => {
  const source = readFileSync(
    ".github/workflows/comun-pwa-browser-compatibility.yml",
    "utf8",
  );
  const workflow = load(source);
  assert.ok(workflow.on.pull_request);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  const job = workflow.jobs.pwa;
  assert.equal(job.env.COMUN_BASE_URL, "http://127.0.0.1:3015");
  assert.equal(job.env.NEXT_PUBLIC_SUPABASE_URL, "http://127.0.0.1:54321");
  assert.equal(job.env.PLAYWRIGHT_SKIP_WEBSERVER, undefined);
  assert.equal(
    job.steps.find((step) => step.uses === "actions/checkout@v4").with[
      "persist-credentials"
    ],
    false,
  );
  assert.equal(
    job.steps.filter((step) => step.run === "npm run quality:pwa").length,
    1,
  );
  assert.doesNotMatch(
    source,
    /secrets\.|SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|SERVICE_ROLE|comunsocial\.online|PLAYWRIGHT_SKIP_WEBSERVER|continue-on-error/,
  );
  for (const step of job.steps) {
    assert.equal(step.env?.COMUN_BASE_URL, undefined);
    assert.equal(step.env?.PLAYWRIGHT_SKIP_WEBSERVER, undefined);
  }
});
