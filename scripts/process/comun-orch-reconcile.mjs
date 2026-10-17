import {execFileSync} from 'node:child_process';
import {hash, transition, PROTECTED} from './comun-orch-v2.mjs';
import {diagnoseJob,recoveryDecision,summarizeFailures} from './comun-orch-ci-diagnostics.mjs';

export const REPOSITORY = 'alexandrevrabandonada-oss/comunvrabandonada';
export const DELAYS = [15, 60, 240, 720, 1440].map(m => m * 60000);
const WORKFLOWS = {
  'pr556-contract': 'COMUN ORCH-V2 contract',
  'pr556-quality': 'COMUN Quality Performance Deliverability',
  'pr556-security': 'COMUN Security Resilience Deliverability',
};
const REVIEWS = new Set(['review-pr511-stack', 'review-pr545', 'review-pr550', 'review-pr554']);
const sha = s => /^[a-f0-9]{40}$/.test(s ?? '');
const protectedTask = t => ['RUNNING', 'WAIT_HUMAN', 'BLOCKED_PROTECTED'].includes(t.status) ||
  PROTECTED.includes(t.action) || t.authorized === false || t.operations.some(o => o.state === 'UNCERTAIN');

// Closed registry of already tracked work. Never discovers new PRs or permissions.
export function watchSpec(t) {
  if (protectedTask(t) || t.pr_effect !== 'EXISTING_PR') return null;
  if (WORKFLOWS[t.task_id] && t.target_pr === 556 && t.probe?.pr === 556 &&
      t.probe.kind === 'github-run' && !t.proof_contract &&
      t.inputs.contract === `${WORKFLOWS[t.task_id]}: aggregate workflow conclusion on exact head only`)
    return {kind: 'workflow', pr: 556, workflow: WORKFLOWS[t.task_id]};
  if (REVIEWS.has(t.task_id) && t.action === 'read-only' && Number.isSafeInteger(t.target_pr))
    return {kind: 'review-head', pr: t.target_pr};
  return null;
}

export function inventory(state, control = state.observer) {
  return state.tasks.map(t => ({
    task_id: t.task_id, status: t.status, sha: t.inputs.sha,
    dependencies: t.dependencies,
    eligible_dependencies: t.dependencies.every(id => {
      const d = state.tasks.find(x => x.task_id === id);
      return d?.status === 'DONE' && (d.target_pr !== t.target_pr || d.inputs.sha === t.inputs.sha);
    }),
    observer: watchSpec(t),
    next_probe_at: control?.cursors?.[t.task_id]?.next_probe_at ?? t.next_probe_at,
    unblocking_evidence: t.task_id === 'pr552-cost-publication'
      ? 'Own COST-02 job117036307632/run38919753803 plus normalized exact Git Preview on14596e75; aggregate success cannot satisfy it'
      : t.task_id === 'pr554-domain'
        ? 'Existing review-pr554 is complete; Home domain integration still requires preserved552/553 submitPublicSearch and550 Jogos decisions plus real human UX evidence; no authorization from a timer'
        : watchSpec(t)?.kind === 'workflow'
          ? 'Current tracked PR head and exact named pull_request workflow id/attempt/status/conclusion; old proofs stay on their own SHA'
          : t.human_action_required ?? null,
  }));
}

export function nextObservation(state, now, control = state.observer) {
  if (state.tasks.some(t => t.status === 'RUNNING' || t.operations.some(o => o.state === 'UNCERTAIN'))) return null;
  return state.tasks.filter(t => watchSpec(t)).map(t => {
    const c = control?.cursors?.[t.task_id];
    const same = c?.input_fingerprint === t.input_fingerprint;
    // A legacy suspended cursor has no deadline: allow one half-open read,
    // then persist a daily cooldown. Never spin on a broken provider.
    const due = same
      ? (c.suspended && c.next_probe_at === null ? 0 : Date.parse(c.next_probe_at))
      : 0;
    return {t, c: same ? c : null, due};
  }).filter(x => Number.isFinite(x.due) && x.due <= now)
    .sort((a,b) => a.due - b.due || a.t.priority - b.t.priority || a.t.task_id.localeCompare(b.t.task_id))[0]?.t ?? null;
}

const api = route => JSON.parse(execFileSync('gh', ['api', route], {
  encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
  stdio: ['ignore','pipe','pipe'],
}));
const logRead = route => execFileSync('gh',['api',route],{
  encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});
export function readTracked(t, read = api, readLog = logRead) {
  const spec = watchSpec(t);
  if (!spec) throw Error('UNTRACKED_OBSERVATION');
  const p = read(`repos/${REPOSITORY}/pulls/${spec.pr}`);
  if (p.number !== spec.pr || p.state !== 'open' || p.base?.repo?.full_name !== REPOSITORY ||
      p.head?.repo?.full_name !== REPOSITORY || !sha(p.head.sha)) throw Error('PROVIDER_PR_SCOPE_CHANGED');
  const source = {repository: REPOSITORY, pr: p.number, sha: p.head.sha, branch: p.head.ref, kind: spec.kind};
  if (spec.kind === 'workflow') {
    const page = read(`repos/${REPOSITORY}/actions/runs?head_sha=${p.head.sha}&event=pull_request&per_page=100`);
    if (!Array.isArray(page.workflow_runs) || page.total_count > 100) throw Error('PROVIDER_RUNS_INCOMPLETE');
    const runs = page.workflow_runs.filter(r => r.head_sha === p.head.sha && r.name === spec.workflow && r.event === 'pull_request');
    const r = runs.sort((a,b) => b.id - a.id || b.run_attempt - a.run_attempt)[0];
    if (r) {
      if (r.repository?.full_name !== REPOSITORY || !Number.isSafeInteger(r.id) || r.id <= 0 ||
          !Number.isSafeInteger(r.run_attempt) || r.run_attempt < 1) throw Error('PROVIDER_RUN_SCOPE_CHANGED');
      source.run = {id:r.id, name:r.name, head_sha:r.head_sha, event:r.event,
        status:r.status, conclusion:r.conclusion, run_attempt:r.run_attempt};
      if(r.status==='completed' && r.conclusion==='failure') {
        const old=t.ci_diagnostics;
        // Same failed attempt is diagnosed once. An enrichment does not grant
        // execution retries; missing logs remain indeterminate until new input.
        if(old?.complete===true&&old.head_sha===p.head.sha&&old.run_id===r.id&&old.run_attempt===r.run_attempt)source.diagnostics=old;
        else {
          const diagnostics={version:1,head_sha:p.head.sha,run_id:r.id,run_attempt:r.run_attempt,jobs:[],complete:false};
          try {
            const jobs=read(`repos/${REPOSITORY}/actions/runs/${r.id}/jobs?filter=latest&per_page=100`);
            if(!Array.isArray(jobs.jobs)||jobs.total_count>100||jobs.total_count!==jobs.jobs.length)throw Error('INCOMPLETE_JOB_INVENTORY');
            const failed=jobs.jobs.filter(j=>j.conclusion==='failure');
            if(!failed.length||failed.length>6)throw Error('BOUNDED_FAILED_JOB_SCOPE_REQUIRED');
            for(const j of failed){
              if(j.run_id!==r.id||j.head_sha!==p.head.sha)throw Error('JOB_HEAD_MISMATCH');
              let log=null;
              try{log=readLog(`repos/${REPOSITORY}/actions/jobs/${j.id}/logs`);}catch(error){diagnostics.read_error=readFailure(error);}
              diagnostics.jobs.push(diagnoseJob({head_sha:p.head.sha,run_id:r.id,run_attempt:r.run_attempt,job:j,log,
                log_sha256:typeof log==='string'?hash(log):null,complete:typeof log==='string'}));
            }
            diagnostics.complete=diagnostics.jobs.every(j=>j.complete);
          }catch(error){diagnostics.reason='FAILED_JOB_EVIDENCE_INCOMPLETE';diagnostics.complete=false;diagnostics.read_error=readFailure(error);}
          diagnostics.summary=summarizeFailures(diagnostics.jobs);
          source.diagnostics=diagnostics;
        }
      }
    } else source.run = null;
    // Head movement during the compound read is never a coherent observation.
    if (read(`repos/${REPOSITORY}/pulls/${spec.pr}`).head?.sha !== p.head.sha) throw Error('PROVIDER_HEAD_MOVED');
  }
  return source;
}

function applyWorkflowObservation(state, id, source, now) {
  let next = state;
  const t = state.tasks.find(t => t.task_id === id), spec = t && watchSpec(t);
  if (!spec || source.repository !== REPOSITORY || source.pr !== spec.pr || source.kind !== spec.kind || !sha(source.sha))
    throw Error('OBSERVATION_SCOPE_REQUIRED');
  if (spec.kind === 'review-head') {
    if (source.sha === t.inputs.sha) return state;
    next = transition(state,id,{type:'inputs',inputs:{...t.inputs,sha:source.sha,source_evidence_sha:hash(source)}},now);
  } else {
    const r = source.run;
    if (!r) {
      if (source.sha === t.inputs.sha) return state;
      next = transition(state,id,{type:'inputs',inputs:{...t.inputs,sha:source.sha,run:null,source_evidence_sha:hash(source)}},now);
    } else {
      if (r.head_sha !== source.sha || r.name !== spec.workflow || r.event !== 'pull_request' ||
          !Number.isSafeInteger(r.id) || r.id <= 0 || !Number.isSafeInteger(r.run_attempt) || r.run_attempt < 1)
        throw Error('OBSERVATION_RUN_REQUIRED');
      const sameRun = t.inputs.sha === source.sha && t.inputs.run === r.id &&
        (t.inputs.run_attempt ?? 1) >= r.run_attempt;
      // A serializer/adapter change is not a new contradiction or retry credit.
      if (sameRun && ((t.attempts_for_fingerprint >= 2 && r.status === 'completed' && r.conclusion !== 'success') ||
          (t.status === 'DONE' && r.status === 'completed' && r.conclusion === 'success')))
        return state;
      // Operational source fingerprint excludes timestamps and provider noise.
      const inputs = {...t.inputs,sha:source.sha,run:r.id,run_attempt:r.run_attempt,source_evidence_sha:hash(source)};
      if (hash(inputs) === t.input_fingerprint) return state;
      next = transition(state,id,{type:'inputs',inputs},now);
      const current = next.tasks.find(t => t.task_id === id);
      next = transition(next,id,{type:'result',sha:source.sha,input_fingerprint:current.input_fingerprint,
        result:r.status !== 'completed' ? 'PENDING' : r.conclusion === 'success' ? 'PASS' : 'FAIL',
        attempt_id:`observation:${hash(source)}`,probe_id:`observation:${hash(source)}`,
        observation_fingerprint:hash(source),evidence_sha:hash(source),
        failure:{kind:'WORKFLOW_CONCLUSION',run:r.id,attempt:r.run_attempt,conclusion:r.conclusion},
        scope:`${spec.workflow} run${r.id}/attempt${r.run_attempt} aggregate on exact${source.sha}; not all-head checks, COST-02, Preview, schema, merge or Production`},now);
    }
  }
  // Keep the complete prior proof and failure budgets; no PASS migrates with input.
  const changed = next.tasks.find(x => x.task_id === id);
  changed.input_history = [...(changed.input_history ?? []), {
    inputs:t.inputs,input_fingerprint:t.input_fingerprint,status:t.status,
    evidence:t.evidence,failure_fingerprint:t.failure_fingerprint,attempts_for_fingerprint:t.attempts_for_fingerprint,
    reason:'Verified tracked external source changed',source_evidence_sha:hash(source),
  }];
  // Dependent review binds only once all relevant workflows name the SAME head.
  const cert = next.tasks.find(x => x.task_id === 'review-pr556-certification');
  if (cert && !protectedTask(cert) && cert.dependencies.length && cert.target_pr === 556) {
    const deps = cert.dependencies.map(id => next.tasks.find(x => x.task_id === id));
    if (deps.every(d => d?.target_pr === 556 && d.inputs.sha === source.sha) && cert.inputs.sha !== source.sha)
      next = transition(next,cert.task_id,{type:'inputs',inputs:{...cert.inputs,sha:source.sha,source_evidence_sha:hash(deps.map(d=>d.inputs))}},now);
  }
  return next;
}

export function applyObservation(state,id,source,now) {
  const {diagnostics,...identity}=source;
  let next=applyWorkflowObservation(state,id,identity,now);
  if(!diagnostics)return next;
  if(diagnostics.head_sha!==source.sha||diagnostics.run_id!==source.run?.id||
      diagnostics.run_attempt!==source.run?.run_attempt||!Array.isArray(diagnostics.jobs)||
      diagnostics.jobs.some(d=>d.head_sha!==source.sha||d.run_id!==source.run.id||d.run_attempt!==source.run.run_attempt))
    throw Error('DIAGNOSTIC_SCOPE_REQUIRED');
  const t=next.tasks.find(t=>t.task_id===id);
  if(hash(t.ci_diagnostics??null)===hash(diagnostics))return next;
  // Enrichment is metadata under the same owner/CAS. It never transitions a
  // result, reopens protected work or resets the existing failure budget.
  next=structuredClone(next);const current=next.tasks.find(t=>t.task_id===id);
  if(current.ci_diagnostics)current.ci_diagnosis_history=[...(current.ci_diagnosis_history??[]),current.ci_diagnostics];
  current.ci_diagnostics=diagnostics;
  current.recovery_decisions=diagnostics.jobs.map(d=>recoveryDecision(d,{now,
    previous:t.ci_diagnostics?.jobs?.find(j=>j.job_id===d.job_id),protected_task:protectedTask(t),
    uncertain:t.operations.some(o=>o.state==='UNCERTAIN')}));
  next.revision++;
  return next;
}

export function readFailure(error) {
  const text = `${error.message ?? ''} ${error.stderr?.toString() ?? ''}`;
  const code = text.match(/HTTP\s+(\d{3})/)?.[1] ??
    (error.code === 'ETIMEDOUT' || error.signal ? 'TIMEOUT' :
      /PROVIDER_/.test(text) ? text.match(/PROVIDER_[A-Z_]+/)[0] : 'READ_FAILED');
  return {kind:'TRACKED_READ_FAILED',code};
}

// Returned control belongs in the platform's already-required automation memory,
// never in an unchanged operational ledger. Only changed task evidence uses CAS.
export function reconcileOne(state, t, now, read = readTracked, control = state.observer) {
  const before = control?.cursors?.[t.task_id];
  let next = state, source, error;
  try {source = read(t); next = applyObservation(state,t.task_id,source,now);
    // Missing logs are an observation failure too: use the existing memory
    // circuit, then recover on the same HEAD/attempt without another writer.
    if(source.diagnostics?.read_error)error=source.diagnostics.read_error;
  }
  catch (e) {error = readFailure(e);}
  const material = next !== state;
  const fingerprint = error ? hash(error) : hash(source);
  const same = before?.observation_fingerprint === fingerprint && before.input_fingerprint === t.input_fingerprint;
  const count = same ? (before.no_change_count ?? 0) + 1 : 0;
  // Circuit breaker remains bounded after its half-open recovery attempt.
  const failures = error ? Math.min(2, same ? (before.read_failures ?? 0) + 1 : 1) : 0;
  const suspended = failures >= 2;
  const current = next.tasks.find(x => x.task_id === t.task_id);
  const cursor = {input_fingerprint:current.input_fingerprint,observation_fingerprint:fingerprint,
    no_change_count:count,read_failures:failures,suspended,
    // Two identical errors stop hot retries, but never disable observation
    // forever: one read-only half-open check per day can detect recovery.
    next_probe_at:new Date(now + (suspended ? DELAYS[DELAYS.length-1] :
      DELAYS[Math.min(count,DELAYS.length-1)])).toISOString(),
    error_fingerprint:error ? fingerprint : null,last_notified_fingerprint:error ? fingerprint : null};
  const observer_control = {...control,version:1,cursors:{...control?.cursors,[t.task_id]:cursor}};
  const notifications = error && before?.last_notified_fingerprint !== fingerprint
    ? [{task_id:t.task_id,fingerprint,action:`Read of tracked PR${watchSpec(t).pr} failed: ${error.code}; two equivalent failures open a 24h read-only circuit; no workflow retry`}] : [];
  return {state:next,observer_control,material,source,error,notifications,
    observation:{task_id:t.task_id,changed:material,source_evidence_sha:source ? hash(source) : null,
      error_fingerprint:error ? fingerprint : null,next_probe_at:cursor.next_probe_at,suspended}};
}
