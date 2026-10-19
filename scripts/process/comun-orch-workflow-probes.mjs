import {hash} from './comun-orch-v2.mjs';

const workflows = Object.freeze({
  'pr556-quality': 'COMUN Quality Performance Deliverability',
  'pr556-security': 'COMUN Security Resilience Deliverability',
});

// Prepare an explicit inputs observation, never a result or a network operation.
// The installed aggregate guard remains unchanged. Deployment requirements live
// in proof_contract and cannot be satisfied by these workflow-only observations.
export function workflowProbeObservation(t, source) {
  const name = workflows[t.task_id];
  if (!name || t.probe?.kind !== 'github-run' || t.probe.pr !== 556 ||
      t.proof_contract || t.status === 'RUNNING' ||
      ['WAIT_HUMAN', 'BLOCKED_PROTECTED'].includes(t.status) ||
      t.operations.some(o => o.state === 'UNCERTAIN'))
    throw Error('WORKFLOW_SCOPE_REQUIRED');
  if (t.inputs.contract !== `${name} exact head only; not all PR checks, Preview, merge or Production` &&
      t.inputs.contract !== `${name}: aggregate workflow conclusion on exact head only`)
    throw Error('WORKFLOW_SCOPE_REQUIRED');
  if (!/^[0-9a-f]{40}$/.test(source.sha) ||
      source.run?.head_sha !== source.sha || source.run?.name !== name ||
      !Number.isSafeInteger(source.run?.id) || source.run.id <= 0 ||
      source.run?.event !== 'pull_request' ||
      source.repository !== 'alexandrevrabandonada-oss/comunvrabandonada' ||
      !/^[0-9a-f]{64}$/.test(source.source_evidence_sha ?? '') ||
      source.source_evidence_sha !== hash(source.run))
    throw Error('WORKFLOW_SOURCE_REQUIRED');
  if (hash(t.inputs) !== t.input_fingerprint)
    throw Error('INVALID_FINGERPRINT');
  return {
    task_id: t.task_id,
    event: {type: 'inputs', inputs: {
      sha: source.sha,
      run: source.run.id,
      contract: `${name}: aggregate workflow conclusion on exact head only`,
      source_evidence_sha: source.source_evidence_sha,
    }},
    prior: {
      inputs: structuredClone(t.inputs),
      input_fingerprint: t.input_fingerprint,
      status: t.status,
      failure_fingerprint: t.failure_fingerprint,
      attempts_for_fingerprint: t.attempts_for_fingerprint,
      last_attempt_id: t.last_attempt_id ?? null,
      probe_pause: structuredClone(t.probe_pause ?? null),
      evidence: structuredClone(t.evidence),
    },
    scope: 'Workflow aggregate input repair only; all-head checks, deployment, merge and Production remain separate',
  };
}
