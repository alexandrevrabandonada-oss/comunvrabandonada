import { execFileSync } from 'node:child_process';
import { hash, task, plan, PROTECTED, validate } from './comun-orch-v2.mjs';
import { REPOSITORY } from './comun-orch-reconcile.mjs';

const sha = s => /^[a-f0-9]{40}$/.test(s ?? '');
const digest = s => /^[a-f0-9]{64}$/.test(s ?? '');
const api = route => JSON.parse(execFileSync('gh', ['api', route], {
  encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
}));
const logRead = route => execFileSync('gh', ['api', route], {
  encoding: 'utf8', timeout: 20000, maxBuffer: 2 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
});
export const DISCOVERY_ID = 'queue-discovery';
const discoveryInput = state => hash({authorization:state.queue_discovery?.authorization,contract:'EXISTING_PR_REPAIR_DISCOVERY_V2_ANSI'});
export function permitted(state) {
  const a = state.queue_discovery?.authorization;
  return a?.source === 'human-message' && a.scope === 'existing-pr-code-repair' &&
    digest(a.evidence_sha) && a.no_new_prs === true;
}
export function discoveryDue(state, now, control) {
  if (!permitted(state) || plan(state, { now }).action === 'EXECUTE' ||
    state.tasks.some(t => t.status === 'RUNNING' || t.operations.some(o => o.state === 'UNCERTAIN'))) return false;
  const c = control?.cursors?.[DISCOVERY_ID];
  return !c || c.input_fingerprint !== discoveryInput(state) || (c.suspended && c.next_probe_at === null) || Date.parse(c.next_probe_at) <= now;
}
const protectedPr = (state, pr) => state.tasks.some(t => t.target_pr === pr &&
  (['WAIT_HUMAN', 'BLOCKED_PROTECTED', 'RUNNING'].includes(t.status) ||
    PROTECTED.includes(t.action) || t.authorized === false || t.operations.some(o => o.state === 'UNCERTAIN')));

// Read one complete bounded PR inventory, then triage at most ONE existing head.
// Only a known, non-semantic repair recipe is automatically admitted. Other
// failures require scoped diagnosis/repair evidence, never a guessed CI fix.
export function readDiscovery(state, cursor, read = api, readLog = logRead) {
  const prs = read(`repos/${REPOSITORY}/pulls?state=open&per_page=100&sort=updated&direction=desc`);
  if (!Array.isArray(prs) || prs.length >= 100 || new Set(prs.map(p => p.number)).size !== prs.length ||
    prs.some(p => !Number.isSafeInteger(p.number) || p.state !== 'open' || !sha(p.head?.sha) ||
      p.base?.repo?.full_name !== REPOSITORY)) throw Error('DISCOVERY_INVENTORY_INCOMPLETE');
  const inventory = prs.map(p => ({ pr: p.number, sha: p.head.sha, branch: p.head.ref,
    repository: p.head.repo?.full_name, base: p.base.ref }));
  const eligible = prs.filter(p => p.head.repo?.full_name === REPOSITORY && !protectedPr(state, p.number))
    .sort((a, b) => (a.number === 551 ? -1 : b.number === 551 ? 1 : a.number - b.number));
  // Rotation is in the existing observer memory, never a second cursor file.
  const index = (cursor?.scan_index ?? 0) % Math.max(eligible.length, 1);
  const p = eligible[index];
  const source = { repository: REPOSITORY, complete: true, observed_at: new Date().toISOString(), inventory, candidate: null,
    scan_index: (cursor?.scan_index ?? 0) + 1, scan_complete: index === eligible.length - 1,
    reason: p ? 'NO_SUPPORTED_REPAIR_EVIDENCE' : 'NO_UNPROTECTED_EXISTING_PR',
    needed: 'Current exact-head failed job, reproducible non-sensitive repair scope and existing-branch authorization' };
  if (!p) return source;
  source.triaged_pr = p.number; source.triaged_sha = p.head.sha;
  const page = read(`repos/${REPOSITORY}/actions/runs?head_sha=${p.head.sha}&event=pull_request&per_page=100`);
  if (!Array.isArray(page.workflow_runs) || page.total_count > 100) throw Error('DISCOVERY_RUNS_INCOMPLETE');
  const latest = new Map();
  for (const r of [...page.workflow_runs].sort((a, b) => b.id - a.id)) {
    if (r.head_sha !== p.head.sha || r.event !== 'pull_request' || r.repository?.full_name !== REPOSITORY)
      throw Error('DISCOVERY_RUN_SCOPE_CHANGED');
    if (!latest.has(r.workflow_id ?? r.name)) latest.set(r.workflow_id ?? r.name, r);
  }
  const runs = [...latest.values()].filter(r => r.status === 'completed' && r.conclusion === 'failure')
    .sort((a, b) => (a.name.includes('Experience Coherence') ? -1 : b.name.includes('Experience Coherence') ? 1 : b.id - a.id));
  const r = runs[0];
  if (!r) { source.reason = 'NO_CURRENT_FAILED_WORKFLOW'; return source; }
  source.failed_workflow = {run:r.id,attempt:r.run_attempt,name:r.name,sha:r.head_sha};
  const jobs = read(`repos/${REPOSITORY}/actions/runs/${r.id}/jobs?filter=latest&per_page=100`);
  if (!Array.isArray(jobs.jobs) || jobs.total_count > 100) throw Error('DISCOVERY_JOBS_INCOMPLETE');
  const j = jobs.jobs.find(j => j.conclusion === 'failure' && j.steps?.some(s =>
    s.conclusion === 'failure' && /format|prettier/i.test(s.name)));
  if (!j) return source;
  if (j.head_sha !== p.head.sha || j.run_id !== r.id || !Number.isSafeInteger(j.id)) throw Error('DISCOVERY_JOB_SCOPE_CHANGED');
  // Avoid re-reading already admitted failed jobs, even after DONE or SHA advancement.
  if (state.tasks.some(t => t.discovery?.pr === p.number && t.discovery?.source_sha === p.head.sha &&
    t.discovery?.run === r.id && t.discovery?.attempt === r.run_attempt)) {
    source.reason = 'ALREADY_ADMITTED'; return source;
  }
  const log = readLog(`repos/${REPOSITORY}/actions/jobs/${j.id}/logs`);
  // Actual Actions log38745687823 colors "warn" *inside* brackets. Keep
  // the raw bytes hashed, but parse text after removing terminal CSI codes.
  const plain = log.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const paths = [...new Set([...plain.matchAll(/\[warn\]\s+(tests\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|mjs))(?=\s|$)/g)].map(m => m[1]))];
  if (!paths.length || paths.length > 3 || paths.some(p => p.includes('..') || /school|escola|auth|schema|migration|captcha|permission|secret/i.test(p)) ||
    !/Code style issues found/.test(plain)) return source;
  const current = read(`repos/${REPOSITORY}/pulls/${p.number}`);
  if (current.state !== 'open' || current.head?.sha !== p.head.sha || current.head?.ref !== p.head.ref ||
    current.head?.repo?.full_name !== REPOSITORY) throw Error('DISCOVERY_HEAD_MOVED');
  const evidence = { repository: REPOSITORY, pr: p.number, sha: p.head.sha, branch: p.head.ref,
    run: r.id, attempt: r.run_attempt, workflow: r.name, job: j.id, log_sha: hash(log),
    failed_step: j.steps.find(s => s.conclusion === 'failure').name, paths,
    recipe: 'PRETTIER_TEST_ONLY', scope: 'Formatting only; token equivalence required; other checks remain unverified' };
  source.candidate = evidence; source.reason = 'PROVEN_EXISTING_BRANCH_REPAIR';
  return source;
}

export function admitDiscovery(state, source, now) {
  if (!permitted(state)) throw Error('DISCOVERY_AUTHORIZATION_REQUIRED');
  if (source.repository !== REPOSITORY || source.complete !== true || !Array.isArray(source.inventory) ||
    !Number.isFinite(Date.parse(source.observed_at)) || Date.parse(source.observed_at)>now+30000 || now-Date.parse(source.observed_at)>30*60000)
    throw Error('DISCOVERY_INVENTORY_REQUIRED');
  const e = source.candidate;
  if (!e) return state;
  if (plan(state, { now }).action === 'EXECUTE' || state.tasks.some(t => t.status === 'RUNNING' ||
    t.operations.some(o => o.state === 'UNCERTAIN'))) throw Error('DISCOVERY_NOT_EMPTY_OR_INTERRUPTED');
  if (protectedPr(state, e.pr)) throw Error('DISCOVERY_PROTECTED_PR');
  if (e.repository !== REPOSITORY || !sha(e.sha) || !Number.isSafeInteger(e.pr) ||
    !source.inventory.some(p => p.pr === e.pr && p.sha === e.sha && p.branch === e.branch && p.repository === REPOSITORY) ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(e.branch ?? '') || e.branch.includes('..') || /^(main|master|production)$/.test(e.branch) ||
    !Number.isSafeInteger(e.run) || !Number.isSafeInteger(e.job) || !Number.isSafeInteger(e.attempt) ||
    !digest(e.log_sha) || e.recipe !== 'PRETTIER_TEST_ONLY' || !Array.isArray(e.paths) || !e.paths.length || e.paths.length > 3 ||
    e.paths.some(p => !/^tests\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|mjs)$/.test(p) || p.includes('..') ||
      /school|escola|auth|schema|migration|captcha|permission|secret/i.test(p))) throw Error('DISCOVERY_EVIDENCE_SCOPE');
  const finding = hash({ pr: e.pr, sha: e.sha, recipe: e.recipe, paths: [...e.paths].sort() });
  if (state.tasks.some(t => t.discovery?.finding === finding)) return state;
  // Same finding at the same head cannot buy more attempts through another run/ID.
  const next = structuredClone(state);
  next.tasks.push(task({ task_id: `repair-pr${e.pr}-${finding.slice(0, 16)}`, priority: 0,
    inputs: { sha: e.sha, contract: e.scope, finding }, action: 'local-code', authorized: true,
    pr_effect: 'EXISTING_PR', target_pr: e.pr, work_class: 'IMPLEMENTATION', execution_base: 'PR_HEAD',
    branch: e.branch, source: 'docs/comun-product-objective-and-roadmap.md#orch-v2--resiliência-da-execução-do-roadmap-16102026',
    discovery: { ...e, source_sha: e.sha, finding, evidence_sha: hash(e), observed_at: new Date(now).toISOString(),
      authorization: structuredClone(state.queue_discovery.authorization) } }));
  next.revision++;
  return validate(next);
}

export function replenish(state, { now, observer_control, read = readDiscovery } = {}) {
  const control = structuredClone(observer_control ?? { version: 1, cursors: {} });
  const old = control.cursors[DISCOVERY_ID];
  let source, next = state, error = null;
  try { source = read(state, old); next = admitDiscovery(state, source, now); }
  catch (e) { error = /AUTHORIZATION|PROTECTED|SCOPE|INCOMPLETE|HEAD_MOVED/.test(e.message) ? e.message : 'DISCOVERY_READ_FAILED'; }
  const fp = hash(error ? { error } : { inventory: source.inventory, candidate: source.candidate, reason: source.reason });
  const failures = error ? Math.min(2, (old?.error_fingerprint === fp ? old.read_failures : 0) + 1) : 0;
  const admitted = next !== state;
  const blocker = hash(error ? { error } : { reason: source.reason, needed: source.needed });
  const notified = [...new Set([...(old?.notified_fingerprints ?? []), ...(old?.last_notified_fingerprint ? [old.last_notified_fingerprint] : [])])];
  const notify = !admitted && !notified.includes(blocker);
  if (notify) notified.push(blocker);
  control.cursors[DISCOVERY_ID] = { input_fingerprint: discoveryInput(state), observation_fingerprint: fp,
    no_change_count: admitted ? 0 : (old?.observation_fingerprint === fp ? old.no_change_count : 0) + 1,
    read_failures: failures, suspended: failures >= 2, next_probe_at: new Date(now + (failures >= 2 ? 86400000 : source?.scan_complete ? 4 * 3600000 : 40 * 60000)).toISOString(),
    error_fingerprint: error ? fp : null, last_notified_fingerprint: notify ? blocker : old?.last_notified_fingerprint ?? null,
    scan_index: source?.scan_index ?? old?.scan_index ?? 0,
    notified_fingerprints: notified,
    cycles_since_delivery: (old?.cycles_since_delivery ?? 0) + 1 };
  return { state: next, observer_control: control, discovery: { admitted: admitted ? next.tasks.at(-1).task_id : null,
    reason: error ?? source.reason, triaged_pr: source?.triaged_pr ?? null, triaged_sha: source?.triaged_sha ?? null,
    failed_workflow: source?.failed_workflow ?? null, evidence_sha: source ? hash(source) : null,
    blocker: admitted ? null : { fingerprint: blocker, reason: error ?? source.reason, needed: source?.needed ?? 'Complete current-head read access and inventory evidence' } },
    notifications: notify ? [{ kind: 'DISCOVERY_BLOCKED', fingerprint: blocker, reason: error ?? source.reason,
      needed: source?.needed ?? 'Complete current-head read access and inventory evidence' }] : [] };
}
