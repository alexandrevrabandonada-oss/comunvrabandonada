// Boundary adapter for the exact pure candidate from PR #556. Legacy fields survive.
import {planCycle, recordCycleResult, recordProbeObservation, classifyPreview,
  reconcileExternalOutcome} from './orch-v2-candidate.mjs';

export function plannerTask(t, now) {
  return {
    taskId:t.task_id, status:t.status === 'RETRY_BACKOFF' && t.attempts_for_fingerprint < 2 &&
      Date.parse(t.next_probe_at) <= now ? (t.probe?'WAIT_CI':'READY') : t.status,
    priority:-t.priority, authorized:t.authorized !== false &&
      (!t.action || ['local-code','read-only'].includes(t.action)) &&
      !t.operations.some(o=>o.state==='UNCERTAIN'),
    action:t.action, dependencies:t.dependencies, inputFingerprint:t.input_fingerprint,
    prEffect:t.pr_effect, targetPr:t.target_pr,
    nextProbeAt:t.probe ? t.next_probe_at : null,
    attemptsForFingerprint:t.attempts_for_fingerprint,
    noProgressCycles:t.no_progress_cycles, stalledOnFingerprint:t.stalled_on_fingerprint,
    lastCycleId:t.last_cycle_id, observationFingerprint:t.observation_fingerprint,
    probeNoChangeCount:t.probe_no_change_count, lastProbeId:t.last_probe_id,
  };
}
export function decide(tasks, now, ownerId='validated-planning-only',portfolio) {
  const active=tasks.filter(t=>t.status==='RUNNING');
  const allowed=tasks.filter(t=>t.status!=='READY' ||
    active.filter(a=>(a.work_class??'IMPLEMENTATION')===(t.work_class??'IMPLEMENTATION')).length <
      (t.work_class==='INTEGRATION'?1:2));
  return planCycle({tasks:allowed.map(t=>plannerTask(t,now)),now,portfolio,
    lock:{status:'OWNED',ownerId,verified:true},checkpointValid:true});
}
export function cycleBackstop(t,event,now) {
  const r=recordCycleResult(plannerTask(t,now),{cycleId:event.cycle_id,
    inputFingerprint:t.input_fingerprint,beforeEvidence:event.before_evidence,
    afterEvidence:event.after_evidence,now});
  if(!r.changed)return t;
  return {...t,status:r.task.status, no_progress_cycles:r.task.noProgressCycles,
    stalled_on_fingerprint:r.task.stalledOnFingerprint,last_cycle_id:r.task.lastCycleId,
    next_probe_at:r.task.nextProbeAt};
}
export function probeBackstop(t,event,now) {
  const r=recordProbeObservation(plannerTask(t,now),{probeId:event.probe_id,
    observationFingerprint:event.observation_fingerprint,now});
  if(!r.changed)return t;
  return {...t,next_probe_at:r.task.nextProbeAt,observation_fingerprint:r.task.observationFingerprint,
    probe_no_change_count:r.task.probeNoChangeCount,last_probe_id:r.task.lastProbeId};
}
export function previewProof(input,now=Date.now()) {
  // The candidate classifier is pure; freshness and SHA validity are enforced here.
  const sha=/^[0-9a-f]{40}$/;
  const fresh=d=>d && sha.test(d.sha) && typeof d.id==='string' &&
    Number.isFinite(Date.parse(d.verifiedAt)) && Date.parse(d.verifiedAt)<=now &&
    now-Date.parse(d.verifiedAt)<=24*3600000;
  if(!sha.test(input.headSha) || !fresh(input.exact) ||
    (input.ancestor && !fresh(input.ancestor)))return {status:'UNVERIFIED',satisfied:false,reason:'fresh-evidence-required'};
  return classifyPreview({...input,exactRequired:input.exactRequired !== false});
}
export function externalProof(operation,result) {
  return reconcileExternalOutcome({operationKind:operation.action==='normal-code-push' ? 'CODE_PUSH' : operation.action,
    outcome:'UNKNOWN',verifiedRemoteResult:result==='APPLIED'?'COMPLETED':'UNKNOWN',
    idempotencyKey:operation.operation_id});
}
