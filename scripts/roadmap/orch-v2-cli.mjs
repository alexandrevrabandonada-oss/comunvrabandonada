#!/usr/bin/env node
// Side-effect-free adapter. One JSON decision to stdout, zero mutations.
import { stdin, stdout, stderr } from 'node:process';
import { planCycle, classifyPreview, fingerprint, notificationDecision,
  recordFailure, observeInputs, reconcileExternalOutcome, recordCycleResult, recordProbeObservation } from './orch-v2.mjs';

const OPERATIONS = Object.freeze({
  plan: planCycle,
  preview: classifyPreview,
  fingerprint,
  notify: ({task,blockerFingerprint}) => notificationDecision(task,blockerFingerprint),
  failure: ({task,...args}) => recordFailure(task,args),
  observe: ({task,...args}) => observeInputs(task,args),
  external: reconcileExternalOutcome,
  cycle: ({task,...args}) => recordCycleResult(task,args),
  probe: ({task,...args}) => recordProbeObservation(task,args),
});
try {
  const chunks = [];
  let size = 0;
  for await (const chunk of stdin) {
    size += chunk.length;
    if (size > 256*1024) throw new Error('INPUT_TOO_LARGE');
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!input || !Object.hasOwn(OPERATIONS,input.operation)) throw new Error('UNKNOWN_OPERATION');
  const result = OPERATIONS[input.operation](input.args);
  stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  stderr.write(`COMUN_ORCH_V2_BLOCKED:${String(error?.message || 'invalid-input')}\n`);
  process.exitCode = 2;
}
