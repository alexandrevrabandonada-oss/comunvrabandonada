import { execFileSync } from 'node:child_process';
import { hash, task, plan, PROTECTED, validate } from './comun-orch-v2.mjs';
import { REPOSITORY } from './comun-orch-reconcile.mjs';
import { DOCS_MERGE_ALLOWED_SKIPPED_WORKFLOWS } from './orch-v2-candidate.mjs';

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
const discoveryInput = state => hash({authorization:state.queue_discovery?.authorization,contract:'EXISTING_PR_REPAIR_DISCOVERY_V3_CURSOR_UPGRADE'});
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

// Product work is referenced in the SAME canonical checkpoint/roadmap. A new
// Markdown paragraph cannot authorize code: each machine-readable entry also
// needs a matching human-sourced grant already installed in the live ledger.
export function readRoadmapDiscovery(ctx, state, readGit = args => execFileSync('git',
  ['-C', ctx.repo, ...args], { encoding: 'utf8', timeout: 30000,
    maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })) {
  const policy = state.roadmap_discovery;
  if (policy?.enabled !== true || policy.source !== 'human-message' ||
      policy.scope !== 'EXISTING_PR_ROADMAP' || !digest(policy.evidence_sha) ||
      !Array.isArray(policy.grants))
    return { reason: 'ROADMAP_HUMAN_POLICY_REQUIRED', candidate: null };
  if (state.tasks.some(t => t.status === 'RUNNING' || t.operations.some(o => o.state === 'UNCERTAIN')) ||
      plan(state, { now: Date.now() }).action === 'EXECUTE')
    return { reason: 'ROADMAP_INTAKE_BUSY', candidate: null };
  const current = readGit(['rev-parse', 'refs/comun/roadmap-execution']).trim();
  if (current !== ctx.canonical) throw Error('ROADMAP_CANONICAL_CHANGED');
  const checkpointPath = 'reports/current/comun-execution-checkpoint.json';
  const roadmapPath = 'docs/comun-product-objective-and-roadmap.md';
  const checkpointBytes = readGit(['show', `${current}:${checkpointPath}`]);
  const roadmapBytes = readGit(['show', `${current}:${roadmapPath}`]);
  const checkpoint = JSON.parse(checkpointBytes);
  const items = checkpoint.roadmap_backlog?.items;
  const source = { reason: 'ROADMAP_NO_AUTHORIZED_READY', candidate: null,
    canonical: current, checkpoint_sha: hash(checkpointBytes), roadmap_sha: hash(roadmapBytes) };
  if (items === undefined) return { ...source, reason: 'ROADMAP_STRUCTURED_CRITERIA_REQUIRED' };
  if (!Array.isArray(items) || items.length > 100 ||
      new Set(items.map(i => i.task_id)).size !== items.length)
    throw Error('ROADMAP_BACKLOG_INCOMPLETE');
  const eligible = items.filter(i => i.status === 'READY' &&
    !state.tasks.some(t => t.task_id === i.task_id || t.roadmap_item === i.task_id))
    .sort((a, b) => a.priority - b.priority || String(a.task_id).localeCompare(String(b.task_id)));
  for (const item of eligible) {
    const grant = policy.grants.find(g => g.task_id === item.task_id);
    if (!grant || grant.source !== 'human-message' || !digest(grant.evidence_sha) ||
        grant.criteria_sha !== hash(item) || grant.revoked === true) continue;
    if (!/^[a-z0-9-]+$/.test(item.task_id) || !Number.isFinite(item.priority) ||
        !Number.isSafeInteger(item.target_pr) || item.target_pr < 1 ||
        !sha(item.sha) || !/^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/.test(item.branch ?? '') ||
        item.branch.includes('..') || /^(main|master|production)$/i.test(item.branch) ||
        !/^## .+$/m.test(item.roadmap_heading ?? '') ||
        item.roadmap_heading.includes('\n') || !roadmapBytes.split(/\r?\n/).includes(item.roadmap_heading) ||
        !Array.isArray(item.paths) || !item.paths.length || item.paths.length > 3 ||
        item.paths.some(p => !/^(components|lib)\/[a-zA-Z0-9_/-]+\.(ts|tsx)$/.test(p) ||
          /auth|school|escola|schema|migration|rls|permission|payment|secret|admin|captcha|env|release/i.test(p)) ||
        !Array.isArray(item.test_criteria) || !item.test_criteria.length ||
        item.test_criteria.some(c => typeof c !== 'string' || !c.trim()) ||
        !Array.isArray(item.dependencies) || protectedPr(state, item.target_pr)) continue;
    // Dependencies are operational proofs of their OWN SHA, never inherited
    // from a checkpoint snapshot or another PR's green workflow.
    if (item.dependencies.some(id => {
      const dependency = state.tasks.find(t => t.task_id === id);
      return !dependency || dependency.status !== 'DONE' ||
        !dependency.evidence.some(e => e.result === 'PASS' && e.sha === dependency.inputs.sha &&
          e.input_fingerprint === dependency.input_fingerprint);
    })) continue;
    source.candidate = { item, grant, policy_sha: policy.evidence_sha };
    source.reason = 'AUTHORIZED_CANONICAL_ROADMAP_ITEM';
    break;
  }
  if (readGit(['rev-parse', 'refs/comun/roadmap-execution']).trim() !== current)
    throw Error('ROADMAP_CANONICAL_CHANGED');
  return source;
}

export function admitRoadmapDiscovery(state, source) {
  if (!source.candidate) return state;
  const { item, grant, policy_sha } = source.candidate;
  // Recheck live authorization after the source read, before the runtime's
  // owner/hash/ref CAS. Caller-supplied evidence cannot install its own grant.
  const policy = state.roadmap_discovery;
  if (policy?.enabled !== true || policy.source !== 'human-message' ||
      policy.scope !== 'EXISTING_PR_ROADMAP' || policy.evidence_sha !== policy_sha ||
      !policy.grants?.some(g => hash(g) === hash(grant) && g.revoked !== true &&
        g.source === 'human-message' && digest(g.evidence_sha) &&
        g.task_id === item.task_id && g.criteria_sha === hash(item)))
    throw Error('ROADMAP_LIVE_AUTHORIZATION_REQUIRED');
  if (state.tasks.some(t => t.task_id === item.task_id)) return state;
  const next = structuredClone(state);
  next.tasks.push(task({ task_id: item.task_id, priority: item.priority,
    dependencies: item.dependencies, inputs: { sha: item.sha,
      contract: item.test_criteria, finding: hash(item) }, action: 'local-code', authorized: true,
    pr_effect: 'EXISTING_PR', target_pr: item.target_pr, work_class: 'IMPLEMENTATION',
    execution_base: 'PR_HEAD', branch: item.branch, roadmap_item: item.task_id,
    source: 'docs/comun-product-objective-and-roadmap.md',
    discovery: { pr: item.target_pr, sha: item.sha, paths: item.paths,
      recipe: 'ROADMAP_SCOPED_BUILD', criteria: item.test_criteria,
      source_sha: item.sha, evidence_sha: hash(source), policy_sha,
      authorization: grant } }));
  next.revision++;
  return validate(next);
}

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
  // Prefer a non-semantic format repair; otherwise admit only an exact,
  // path-scoped TypeScript compiler error, never arbitrary failed CI logs.
  const failing=(job,re)=>job.conclusion==='failure'&&job.steps?.some(s=>
    s.conclusion==='failure'&&re.test(s.name));
  const j=jobs.jobs.find(j=>failing(j,/format|prettier/i)) ??
    jobs.jobs.find(j=>failing(j,/type.?check|typescript|\btsc\b/i));
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
  const failedStep=j.steps.find(s=>s.conclusion==='failure')?.name??'';
  const format=/format|prettier/i.test(failedStep);
  const typecheck=/type.?check|typescript|\btsc\b/i.test(failedStep);
  const formatPaths=[...new Set([...plain.matchAll(/\[warn\]\s+(tests\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|mjs))(?=\s|$)/g)].map(m=>m[1]))];
  // Compiler-style diagnostics only, anchored to the exact failing command:
  // no stack traces, instructions embedded in logs or guessed edit targets.
  const tsPaths=[...new Set([...plain.matchAll(/^(?:\d{4}-\d\d-\d\dT\S+Z\s+)?(?:\.\/)?((?:app|components|lib)\/[A-Za-z0-9_./-]+\.tsx?)\(\d+,\d+\): error TS\d{4}:/gm)].map(m=>m[1]))];
  const recipe=format?'PRETTIER_TEST_ONLY':typecheck?'TSC_SCOPED_FIX':null;
  const paths=recipe==='PRETTIER_TEST_ONLY'?formatPaths:tsPaths;
  if(!recipe||!paths.length||paths.length>3||
    paths.some(p=>p.includes('..')||/school|escola|auth|schema|migration|captcha|permission|secret|middleware|payment|admin|route\.ts/i.test(p))||
    recipe==='PRETTIER_TEST_ONLY'&&!/Code style issues found/.test(plain))return source;
  const current = read(`repos/${REPOSITORY}/pulls/${p.number}`);
  if (current.state !== 'open' || current.head?.sha !== p.head.sha || current.head?.ref !== p.head.ref ||
    current.head?.repo?.full_name !== REPOSITORY) throw Error('DISCOVERY_HEAD_MOVED');
  const evidence = { repository: REPOSITORY, pr: p.number, sha: p.head.sha, branch: p.head.ref,
    run: r.id, attempt: r.run_attempt, workflow: r.name, job: j.id, log_sha: hash(log),
    failed_step: failedStep, paths, recipe,
    scope: recipe==='PRETTIER_TEST_ONLY'
      ? 'Formatting only; token equivalence required; other checks remain unverified'
      : 'Compiler TS errors in at most 3 safe source files; reproduce typecheck, preserve semantics, no test/assertion change; all other checks unverified' };
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
    !digest(e.log_sha) || !['PRETTIER_TEST_ONLY','TSC_SCOPED_FIX'].includes(e.recipe) ||
    !Array.isArray(e.paths) || !e.paths.length || e.paths.length > 3 ||
    e.paths.some(p => p.includes('..') ||
      (e.recipe==='PRETTIER_TEST_ONLY'
        ? !/^tests\/[a-zA-Z0-9_./-]+\.(ts|tsx|js|mjs)$/.test(p)
        : !/^(?:app|components|lib)\/[a-zA-Z0-9_./-]+\.tsx?$/.test(p)) ||
      /school|escola|auth|schema|migration|captcha|permission|secret|middleware|payment|admin|route\.ts/i.test(p)) ||
    e.recipe==='TSC_SCOPED_FIX'&&!/type.?check|typescript|\btsc\b/i.test(e.failed_step??''))
    throw Error('DISCOVERY_EVIDENCE_SCOPE');
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
  // A changed classifier contract must re-evaluate the first candidate, rather
  // than continue past the finding that the previous classifier could not parse.
  // This grants one read migration; it never changes task retry budgets/gates.
  try { source = read(state, old?.input_fingerprint === discoveryInput(state) ? old : undefined); next = admitDiscovery(state, source, now); }
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


// Integration intake deliberately shares the existing observer memory and the
// single lock/ledger. Without an explicit, checked ledger policy it is inert.
export const MERGE_DISCOVERY_ID='queue-docs-merges';
const mergeInput=state=>hash({authorization:state.merge_policy,contract:'DOCS_ONLY_INTAKE_V1'});
export const mergePermitted=state=>{
  const p=state.merge_policy;
  return p?.enabled===true&&p.scope==='DOCS_ONLY'&&p.source==='human-message'&&digest(p.evidence_sha);
};
export function mergeDiscoveryDue(state,now,control) {
  if(!mergePermitted(state)||plan(state,{now}).action==='EXECUTE'||
    state.tasks.some(t=>t.status==='RUNNING'||t.operations.some(o=>o.state==='UNCERTAIN')||
      t.action==='integrate-existing-pr'&&t.status==='READY'))return false;
  const c=control?.cursors?.[MERGE_DISCOVERY_ID];
  return !c||c.input_fingerprint!==mergeInput(state)||
    Number.isFinite(Date.parse(c.next_probe_at))&&Date.parse(c.next_probe_at)<=now;
}
// Fairly arbitrate two due intake lanes. The older due cursor runs first, so
// a constantly due merge scan cannot starve code repair discovery (or vice
// versa). This chooses a read-only intake, not an authorized remote effect.
export function chooseDiscoveryLane(state,now,control,materialBudget=1) {
  if(!Number.isFinite(now)||!Number.isInteger(materialBudget)||materialBudget<=0)return null;
  const dueMerge=mergeDiscoveryDue(state,now,control);
  const dueRepair=discoveryDue(state,now,control);
  if(!dueMerge&&!dueRepair)return null;
  if(!dueMerge)return 'repair';
  if(!dueRepair)return 'merge';
  const scheduled=id=>{
    const raw=control?.cursors?.[id]?.next_probe_at;
    if(!raw)return Number.NEGATIVE_INFINITY; // never run: oldest
    const due=Date.parse(raw);
    return Number.isFinite(due)?due:Number.NEGATIVE_INFINITY;
  };
  return scheduled(DISCOVERY_ID)<scheduled(MERGE_DISCOVERY_ID)?'repair':'merge';
}

export function readMergeDiscovery(state,cursor,read=api) {
  const prs=read('repos/'+REPOSITORY+'/pulls?state=open&per_page=100&sort=updated&direction=desc');
  if(!Array.isArray(prs)||prs.length>=100||new Set(prs.map(x=>x.number)).size!==prs.length||
    prs.some(x=>!Number.isSafeInteger(x.number)||x.state!=='open'||
      !sha(x.head?.sha)||x.base?.repo?.full_name!==REPOSITORY))
    throw Error('MERGE_INVENTORY_INCOMPLETE');
  const inventory=prs.map(x=>({pr:x.number,sha:x.head.sha,branch:x.head.ref,
    repository:x.head.repo?.full_name,base:x.base.ref}));
  const candidates=prs.filter(x=>x.head.repo?.full_name===REPOSITORY&&
    x.draft===false&&x.base.ref==='main'&&
    !protectedPr(state,x.number)&&
    !state.tasks.some(t=>t.target_pr===x.number&&
      (t.action==='integrate-existing-pr'||t.remote_terminal?.kind==='MERGED')))
    .sort((a,b)=>a.number-b.number);
  const index=(cursor?.scan_index??0)%Math.max(candidates.length,1),p=candidates[index];
  const source={repository:REPOSITORY,complete:true,observed_at:new Date().toISOString(),
    inventory,scan_index:(cursor?.scan_index??0)+1,
    scan_complete: index===candidates.length-1,
    candidate:null,reason:p?'NO_CERTIFIED_DOCUMENTAL_MERGE':'NO_ELIGIBLE_OPEN_PR'};
  if(!p)return source;
  source.triaged_pr=p.number;
  const root='repos/'+REPOSITORY;
  const detail=read(root+'/pulls/'+p.number);
  if(detail.number!==p.number||detail.state!=='open'||detail.head?.sha!==p.head.sha||
    detail.head?.ref!==p.head.ref||detail.head?.repo?.full_name!==REPOSITORY)
    throw Error('MERGE_HEAD_MOVED');
  if(detail.draft!==false||detail.mergeable!==true||detail.base?.ref!=='main'||!sha(detail.base?.sha))
    return source;
  const files=read(root+'/pulls/'+p.number+'/files?per_page=100');
  if(!Array.isArray(files)||!files.length||files.length>=100||
    detail.changed_files!==files.length||
    files.some(f=>f.status==='removed'||f.status==='renamed'||
      !/^docs\/[a-z0-9/_-]+\.(md|mdx)$/i.test(f.filename)||
      /^docs\/(?:security|architecture)\//i.test(f.filename)||
      /^docs\/comun-(?:orch-v2-|product-objective-and-roadmap\.|roadmap-hourly-automation\.|escola)/i.test(f.filename)))return source;
  // Never assume any skipped workflow is PASS; only exact-head completed
  // success or specifically conditional SKIPPED is permitted at this intake.
  const page=read(root+'/actions/runs?head_sha='+p.head.sha+'&event=pull_request&per_page=100');
  if(!Array.isArray(page.workflow_runs)||page.total_count>100||
    page.total_count!==page.workflow_runs.length)throw Error('MERGE_RUNS_INCOMPLETE');
  if(!page.workflow_runs.length||page.workflow_runs.some(r=>
    r.event!=='pull_request'||r.head_sha!==p.head.sha||
    r.status!=='completed'||(r.conclusion!=='success'&&
      !(r.conclusion==='skipped'&&DOCS_MERGE_ALLOWED_SKIPPED_WORKFLOWS.includes(r.name)))))return source;
  const cis=page.workflow_runs.filter(r=>r.name==='COMUN CI'&&r.conclusion==='success');
  if(cis.length!==1)return source;
  const jobs=read(root+'/actions/runs/'+cis[0].id+'/jobs?filter=latest&per_page=100');
  if(!Array.isArray(jobs.jobs)||jobs.total_count>100||jobs.total_count!==jobs.jobs.length)
    throw Error('MERGE_JOBS_INCOMPLETE');
  const cost=jobs.jobs.filter(j=>j.name==='COST-02 / exact checkpoint Preview');
  if(cost.length!==1||cost[0].status!=='completed'||cost[0].conclusion!=='success')return source;
  const reviews=read(root+'/pulls/'+p.number+'/reviews?per_page=100');
  const inline=read(root+'/pulls/'+p.number+'/comments?per_page=100');
  if(!Array.isArray(reviews)||reviews.length>=100||reviews.some(r=>r.state==='CHANGES_REQUESTED')||
    !Array.isArray(inline)||inline.length!==0)return source;
  const current=read(root+'/pulls/'+p.number);
  if(current.state!=='open'||current.head?.sha!==p.head.sha||
    current.base?.sha!==detail.base.sha||current.mergeable!==true)
    throw Error('MERGE_HEAD_MOVED');
  const evidence={pr:p.number,sha:p.head.sha,base_sha:detail.base.sha,
    branch:p.head.ref,ci_run:cis[0].id,cost_job:cost[0].id,
    paths:files.map(f=>f.filename).sort(),
    workflow_count:page.workflow_runs.length,
    mode:'DOCS_ONLY'};
  source.candidate={...evidence,fingerprint:hash(evidence)};
  source.reason='CERTIFIED_DOCUMENTAL_MERGE_CANDIDATE';
  return source;
}
export function admitMergeDiscovery(state,source,now) {
  if(!mergePermitted(state))throw Error('MERGE_AUTHORIZATION_REQUIRED');
  if(source?.repository!==REPOSITORY||source.complete!==true||
    !Array.isArray(source.inventory)||!Number.isFinite(Date.parse(source.observed_at))||
    Date.parse(source.observed_at)>now+30000||now-Date.parse(source.observed_at)>30*60000)
    throw Error('MERGE_INVENTORY_REQUIRED');
  const e=source.candidate;
  if(!e)return state;
  // Exact previously admitted PR is idempotent even while its integration
  // task is READY; no second task or proof is created by re-observation.
  if(state.tasks.some(t=>t.target_pr===e.pr&&t.action==='integrate-existing-pr'))return state;
  if(plan(state,{now}).action==='EXECUTE'||state.tasks.some(t=>
    t.status==='RUNNING'||t.operations.some(o=>o.state==='UNCERTAIN')||
    t.action==='integrate-existing-pr'&&t.status==='READY'))
    throw Error('MERGE_INTAKE_BUSY');
  if(!Number.isSafeInteger(e.pr)||!sha(e.sha)||!sha(e.base_sha)||
    !digest(e.fingerprint)||e.mode!=='DOCS_ONLY'||
    !Number.isSafeInteger(e.ci_run)||!Number.isSafeInteger(e.cost_job)||
    !Array.isArray(e.paths)||!e.paths.length||e.paths.some(p=>
      !/^docs\/[a-z0-9/_-]+\.(md|mdx)$/i.test(p)||
      /^docs\/(?:security|architecture)\//i.test(p)||
      /^docs\/comun-(?:orch-v2-|product-objective-and-roadmap\.|roadmap-hourly-automation\.|escola)/i.test(p))||
    !source.inventory.some(p=>p.pr===e.pr&&p.sha===e.sha&&
      p.repository===REPOSITORY&&p.branch===e.branch&&p.base==='main')||
    protectedPr(state,e.pr))throw Error('MERGE_CANDIDATE_SCOPE');
  if(state.tasks.some(t=>t.target_pr===e.pr&&t.action==='integrate-existing-pr'))return state;
  const next=structuredClone(state), authorization=structuredClone(state.merge_policy);
  next.tasks.push(task({task_id:'integrate-docs-pr'+e.pr+'-'+e.sha.slice(0,10),
    priority:1,inputs:{sha:e.sha,contract:'DOCS_ONLY / exact head CI COST-02 and reviews',
      evidence_fingerprint:e.fingerprint},
    action:'integrate-existing-pr',authorized:true,pr_effect:'EXISTING_PR',
    target_pr:e.pr,work_class:'INTEGRATION',
    merge_authorization:{scope:'DOCS_ONLY',evidence_sha:authorization.evidence_sha},
    integration_evidence:{...e,observed_at:new Date(now).toISOString()}}));
  next.revision++;
  return validate(next);
}
export function replenishMergeDiscovery(state,{now,observer_control,read=readMergeDiscovery}={}) {
  const control=structuredClone(observer_control??{version:1,cursors:{}});
  const old=control.cursors[MERGE_DISCOVERY_ID];
  let source, next=state,error=null;
  try {
    source=read(state,old?.input_fingerprint===mergeInput(state)?old:undefined);
    next=admitMergeDiscovery(state,source,now);
  }catch(e){error=/AUTHORIZATION|SCOPE|INCOMPLETE|HEAD_MOVED|BUSY/.test(e.message)
    ?e.message:'MERGE_DISCOVERY_READ_FAILED';}
  const fingerprint=hash(error?{error}:{reason:source.reason,triaged_pr:source.triaged_pr,
    candidate:source.candidate});
  const admitted=next!==state;
  control.cursors[MERGE_DISCOVERY_ID]={
    input_fingerprint:mergeInput(state),observation_fingerprint:fingerprint,
    scan_index:source?.scan_index??old?.scan_index??0,
    next_probe_at:new Date(now+(source?.scan_complete?4*3600000:40*60000)).toISOString(),
    no_change_count:admitted?0:(old?.observation_fingerprint===fingerprint
      ?old.no_change_count:0)+1,
    read_failures:error?(old?.error_fingerprint===fingerprint?(old.read_failures??0)+1:1):0,
    error_fingerprint:error?fingerprint:null};
  return {state:next,observer_control:control,merge_discovery:{
    admitted:admitted?next.tasks.at(-1).task_id:null,
    triaged_pr:source?.triaged_pr??null,
    reason:error??source.reason,evidence_sha:source?hash(source):null}};
}
