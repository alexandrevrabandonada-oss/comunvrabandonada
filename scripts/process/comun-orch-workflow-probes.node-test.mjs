import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {task, hash, transition} from './comun-orch-v2.mjs';
import {probeRun} from './comun-orch-runtime.mjs';
import {workflowProbeObservation} from './comun-orch-workflow-probes.mjs';

const sha = 'a'.repeat(40);
const make = (id = 'quality') => task({task_id: `pr556-${id}`, priority: 1,
  status: 'RETRY_BACKOFF', attempts_for_fingerprint: 1, failure_fingerprint: hash('old failure'),
  inputs: {sha, run: 123, contract: `${id === 'quality' ? 'COMUN Quality Performance Deliverability' : 'COMUN Security Resilience Deliverability'} exact head only; not all PR checks, Preview, merge or Production`},
  probe: {kind: 'github-run', pr: 556}, operations: [],
  probe_pause: {reason: 'local scope predicate defect'},
});
const source = t => {
  const run = {id: 123, head_sha: sha, name: t.task_id.endsWith('quality') ? 'COMUN Quality Performance Deliverability' : 'COMUN Security Resilience Deliverability', event: 'pull_request'};
  return {sha, repository: 'alexandrevrabandonada-oss/comunvrabandonada', run, source_evidence_sha: hash(run)};
};
function withRun(t, run, check) {
  const original = childProcess.execFileSync;
  const calls = [];
  childProcess.execFileSync = (command, args) => {
    assert.equal(command, 'gh'); calls.push(args);
    return args[1].includes('/pulls/') ? `${run.live_head ?? sha}\n` : JSON.stringify(run);
  };
  syncBuiltinESMExports();
  try {check(calls);} finally {childProcess.execFileSync = original; syncBuiltinESMExports();}
}

test('negated scope reproduces defect; precise Quality/Security inputs pass the unchanged runtime guard', () => {
  for (const kind of ['quality', 'security']) {
    const t = make(kind), before = structuredClone(t);
    const observation = workflowProbeObservation(t, source(t));
    assert.deepEqual(t, before);
    assert.deepEqual(observation.prior.failure_fingerprint, t.failure_fingerprint);
    assert.equal(observation.prior.attempts_for_fingerprint, 1);
    const state = transition({schema_version: 2, revision: 0, tasks: [t]}, t.task_id, observation.event, Date.now());
    const fixed = state.tasks[0];
    assert.equal(fixed.status, 'WAIT_CI'); assert.equal(fixed.evidence.length, 0);
    assert.notEqual(fixed.input_fingerprint, t.input_fingerprint);
    withRun(t, {id: 123, head_sha: sha, status: 'completed', conclusion: 'success', run_attempt: 1}, calls => {
      assert.throws(() => probeRun(t), /CONTRACT_JOB_AND_PREVIEW_EVIDENCE_REQUIRED/);
      const result = probeRun(fixed);
      assert.equal(result.result, 'PASS'); assert.equal(result.sha, sha);
      assert.equal(result.input_fingerprint, fixed.input_fingerprint);
      assert.match(result.scope, /GitHub Actions run 123/);
      assert.equal(calls.length, 4);
    });
  }
});

test('publication/COST/custom contracts and protected tasks cannot use workflow input repair', () => {
  for (const mutate of [
    t => {t.proof_contract = 'COST_AND_EXACT_PREVIEW_V1';},
    t => {t.inputs.contract = 'COST-02 / exact checkpoint Preview';},
    t => {t.inputs.contract = 'all PR checks';},
    t => {t.task_id = 'pr552-cost-publication';},
    t => {t.probe.pr = 552;}, t => {t.status = 'WAIT_HUMAN';},
    t => {t.operations = [{state: 'UNCERTAIN'}];},
  ]) {
    const t = make(); mutate(t); t.input_fingerprint = hash(t.inputs);
    assert.throws(() => workflowProbeObservation(t, source(t)), /WORKFLOW_SCOPE_REQUIRED/);
  }
  const t = make(); t.inputs.contract = 'COST-02 / exact checkpoint Preview';
  withRun(t, {id: 123, head_sha: sha, status: 'completed', conclusion: 'success'}, () =>
    assert.throws(() => probeRun(t), /CONTRACT_JOB_AND_PREVIEW_EVIDENCE_REQUIRED/));
});

test('workflow source must prove own SHA, workflow identity, repository, run and source hash', () => {
  for (const patch of [s => {s.run.head_sha = 'b'.repeat(40);}, s => {s.run.name = 'Other';},
    s => {s.run.id = 0;}, s => {s.run.event = 'push';}, s => {s.repository = 'foreign/repo';},
    s => {s.source_evidence_sha = '';}, s => {s.source_evidence_sha = 'f'.repeat(64);}, s => {s.sha = 'invalid';}]) {
    const t = make(), s = source(t); patch(s);
    assert.throws(() => workflowProbeObservation(t, s), /WORKFLOW_SOURCE_REQUIRED/);
  }
});

test('workflow fixture identities match the versioned workflow names', () => {
  for (const [kind, file] of [['quality', 'comun-quality-performance.yml'], ['security', 'comun-security-resilience.yml']]) {
    const name = fs.readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), 'utf8').split(/\r?\n/)[0].slice(6);
    assert.equal(source(make(kind)).run.name, name);
  }
});

test('unchanged aggregate probe rejects stale head and never treats skipped/pending as PASS', () => {
  const t = make(); t.inputs = workflowProbeObservation(t, source(t)).event.inputs;
  t.input_fingerprint = hash(t.inputs);
  for (const r of [
    {status: 'completed', conclusion: 'skipped', expected: 'FAIL'},
    {status: 'in_progress', conclusion: null, expected: 'PENDING'},
    {status: 'completed', conclusion: 'failure', expected: 'FAIL'},
  ]) withRun(t, {id: 123, head_sha: sha, ...r}, () => assert.equal(probeRun(t).result, r.expected));
  for (const r of [{head_sha: 'b'.repeat(40)}, {head_sha: sha, live_head: 'b'.repeat(40)}])
    withRun(t, r, () => assert.throws(() => probeRun(t), /STALE_REMOTE_HEAD/));
});
