import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(".github/workflows/comun-ci.yml", "utf8");

test("CI keeps main push, PR, workflow_call and workflow_dispatch triggers", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /deployment_status:/);
  assert.match(workflow, /workflow_call:/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /branches: \[main, "codex\/\*\*"\]/);
});

test("production candidate topology cannot run on deployment_status", () => {
  const job = workflow.match(
    /  r2a-production-candidate-contract:[\s\S]*?\n  r2a-private-runtime-e2e:/,
  )?.[0] ?? "";
  assert.match(job, /if:/);
  assert.match(job, /github\.event_name == 'pull_request'/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /github\.event_name == 'workflow_call'/);
  assert.match(job, /github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(job, /github\.event_name == 'deployment_status'/);
});

test("Codex freshness job is PR-only and checks the exact checkpoint", () => {
  const job = workflow.match(
    /  cost-02-preview-freshness:[\s\S]*?(?=\n  [a-z0-9-]+:\n|$)/,
  )?.[0] ?? "";
  assert.match(job, /github\.event_name == 'pull_request'/);
  assert.match(job, /startsWith\(github\.event\.pull_request\.head\.ref, 'codex\/'\)/);
  assert.match(job, /verify-codex-preview-checkpoint\.mjs/);
  assert.match(job, /fetch-depth: 0/);
});
