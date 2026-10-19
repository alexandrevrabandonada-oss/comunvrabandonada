// The PR mutation boundary. Never use planner snapshots as admission authority.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {classifyPrAdmission,COMUN_REPOSITORY,DOCS_MERGE_ALLOWED_SKIPPED_WORKFLOWS} from './orch-v2-candidate.mjs';
import {loadState,saveState,ownerProof} from './comun-orch-runtime.mjs';
import {hash} from './comun-orch-v2.mjs';

export function fetchOpenPortfolio() {
  const pages=JSON.parse(execFileSync('gh',['api','--paginate','--slurp',
    `repos/${COMUN_REPOSITORY}/pulls?state=open&per_page=100`],{encoding:'utf8',timeout:30000,maxBuffer:15*1024*1024}));
  if(!Array.isArray(pages)||pages.some(p=>!Array.isArray(p)))throw Error('INCOMPLETE_REMOTE_INVENTORY');
  const prs=pages.flat();
  if(prs.some(p=>!Number.isInteger(p.number)||p.state!=='open') ||new Set(prs.map(p=>p.number)).size!==prs.length)
    throw Error('INCOMPLETE_REMOTE_INVENTORY');
  return {verified:true,repository:COMUN_REPOSITORY,observedAt:new Date().toISOString(),
    openCount:prs.length,openPrNumbers:prs.map(p=>p.number).sort((a,b)=>a-b),
    heads:prs.map(p=>({number:p.number,sha:p.head.sha,branch:p.head.ref}))};
}
function createOnGitHub(body) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comun-pr-intent-')),file=path.join(dir,'body.json');
  try{fs.writeFileSync(file,JSON.stringify(body));return JSON.parse(execFileSync('gh',[
    'api',`repos/${COMUN_REPOSITORY}/pulls`,'--method','POST','--input',file],
    {encoding:'utf8',timeout:30000,maxBuffer:1024*1024}));}
  finally{fs.unlinkSync(file);fs.rmdirSync(dir);}
}
export function createPullRequest(ctx,{owner_id,task_id,operation_id,body},
  {fetchPortfolio=fetchOpenPortfolio,create=createOnGitHub,now=Date.now()}={}) {
  const proof=ownerProof(ctx,owner_id),loaded=loadState(ctx);
  const t=loaded.state.tasks.find(t=>t.task_id===task_id);
  if(!t || t.status!=='RUNNING' || t.owner_id!==owner_id || !t.lease ||
    t.lease.owner_proof!==proof || now>Date.parse(t.lease.deadline_at))throw Error('OWNED_ACTIVE_LEASE_REQUIRED');
  if(!operation_id || t.operations.some(o=>o.state==='UNCERTAIN'||o.operation_id===operation_id))
    throw Error('RECONCILE_BEFORE_EXTERNAL_OPERATION');
  // No cached portfolio: this read occurs inside the real mutation call.
  const remote=fetchPortfolio();
  const active=loaded.state.tasks.filter(x=>x.status==='RUNNING' && x.task_id!==task_id);
  const portfolio={...remote,activeImplementationCount:active.filter(x=>x.work_class!=='INTEGRATION').length,
    activeIntegrationCount:active.filter(x=>x.work_class==='INTEGRATION').length,
    newPrCredits:loaded.state.integration_debt?.verified_creation_credits??0};
  const admission=classifyPrAdmission({task:{taskId:t.task_id,status:t.status,prEffect:t.pr_effect,
    targetPr:t.target_pr,action:'CREATE_PR'},portfolio,now:Date.now()});
  if(!admission.admitted)throw Error(`PR_CREATION_DENIED:${admission.reason}`);
  if(loaded.state.integration_debt?.no_new_prs!==false)throw Error('PR_CREATION_DENIED:mission-no-new-prs');
  if(!body || typeof body.head!=='string' || body.base!=='main' ||
    remote.heads?.some(h=>h.branch===body.head))throw Error('EXISTING_PR_OR_INVALID_TARGET');
  const state=structuredClone(loaded.state),next=state.tasks.find(x=>x.task_id===task_id);
  const intent={operation_id,action:'create-pr',expected_sha:t.inputs.sha,state:'UNCERTAIN',
    portfolio_sha:hash(remote),body_sha:hash(body),cycle_id:t.lease.cycle_id};
  next.operations.push(intent);state.revision++;
  state.integration_debt.verified_creation_credits--;
  saveState(ctx,state,loaded.expectedHash,owner_id); // owner/ref/hash CAS before effect
  const intended=loadState(ctx);
  // Recheck again after intent persistence; another actor can change the remote queue.
  const immediatelyBefore=fetchPortfolio();
  const finalAdmission=classifyPrAdmission({task:{taskId:t.task_id,status:t.status,
    prEffect:t.pr_effect,action:'CREATE_PR'},portfolio:{...portfolio,...immediatelyBefore},now:Date.now()});
  if(!finalAdmission.admitted || immediatelyBefore.heads?.some(h=>h.branch===body.head)) {
    const cancelled=structuredClone(intended.state);
    cancelled.tasks.find(x=>x.task_id===task_id).operations.at(-1).state='NOT_APPLIED';
    cancelled.integration_debt.verified_creation_credits++;cancelled.revision++;
    saveState(ctx,cancelled,intended.expectedHash,owner_id);throw Error('PR_CREATION_DENIED:remote-changed-before-effect');
  }
  if(ownerProof(ctx,owner_id)!==proof || loadState(ctx).expectedHash!==intended.expectedHash ||
    execFileSync('git',['-C',ctx.repo,'rev-parse','refs/comun/roadmap-execution'],{encoding:'utf8'}).trim()!==ctx.canonical)
    throw Error('EXTERNAL_OPERATION_OWNERSHIP_CHANGED');
  // Timeout deliberately leaves UNCERTAIN. Only an authoritative read can settle it.
  const result=create({...body,draft:true});
  if(!Number.isInteger(result.number) || result.head?.sha!==t.inputs.sha)throw Error('UNCERTAIN_REMOTE_PR_RESULT');
  const applied=structuredClone(intended.state);
  Object.assign(applied.tasks.find(x=>x.task_id===task_id).operations.at(-1),
    {state:'APPLIED',pr:result.number,evidence_sha:hash({number:result.number,sha:result.head.sha})});
  applied.revision++;saveState(ctx,applied,intended.expectedHash,owner_id);
  return {number:result.number,sha:result.head.sha};
}


// Opt-in docs-only integration. A local, human-sourced authorization must be
// present in the ledger; CI success alone cannot authorize a merge.
const MERGE_SHA=/^[0-9a-f]{40}$/;
const mergeReadJSON=route=>JSON.parse(execFileSync('gh',['api',route],{
  encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024,stdio:['ignore','pipe','pipe'],
}));
function mergeOnGitHub(pr,head) {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'comun-merge-intent-'));
  try {
    const file=path.join(directory,'request.json');
    fs.writeFileSync(file,JSON.stringify({sha:head,merge_method:'squash'}));
    return JSON.parse(execFileSync('gh',['api',
      'repos/'+COMUN_REPOSITORY+'/pulls/'+pr+'/merge','--method','PUT','--input',file],
      {encoding:'utf8',timeout:30000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}));
  } finally {fs.rmSync(directory,{recursive:true,force:true});}
}
export function readMergeEvidence(prNumber) {
  if(!Number.isSafeInteger(prNumber)||prNumber<1)throw Error('MERGE_TARGET_REQUIRED');
  const root='repos/'+COMUN_REPOSITORY;
  const pr=mergeReadJSON(root+'/pulls/'+prNumber);
  if(!MERGE_SHA.test(pr.head?.sha??''))throw Error('MERGE_HEAD_REQUIRED');
  const files=mergeReadJSON(root+'/pulls/'+prNumber+'/files?per_page=100');
  const runs=mergeReadJSON(root+'/actions/runs?head_sha='+pr.head.sha+'&event=pull_request&per_page=100');
  const reviews=mergeReadJSON(root+'/pulls/'+prNumber+'/reviews?per_page=100');
  const comments=mergeReadJSON(root+'/pulls/'+prNumber+'/comments?per_page=100');
  const ci=runs.workflow_runs?.filter(r=>r.name==='COMUN CI'&&r.head_sha===pr.head.sha&&r.event==='pull_request')
    .sort((a,b)=>b.id-a.id)[0];
  const jobs=ci?mergeReadJSON(root+'/actions/runs/'+ci.id+'/jobs?per_page=100'):null;
  return {pr,files,runs,reviews,comments,jobs};
}
export function assessDocsMerge(e) {
  const p=e?.pr;
  if(!p||p.state!=='open'||p.draft!==false||p.merged===true||p.base?.ref!=='main'||
    p.head?.repo?.full_name!==COMUN_REPOSITORY||p.base?.repo?.full_name!==COMUN_REPOSITORY||
    !MERGE_SHA.test(p.head?.sha??'')||!MERGE_SHA.test(p.base?.sha??'')||
    p.mergeable!==true)throw Error('MERGE_PR_NOT_ELIGIBLE');
  const files=e.files;
  if(!Array.isArray(files)||!files.length||files.length>=100||p.changed_files!==files.length||
    files.some(f=>f.status==='removed'||f.status==='renamed'||
      !/^docs\/[a-z0-9/_-]+\.(?:md|mdx)$/i.test(f.filename)||
      /^docs\/(?:security|architecture)\//i.test(f.filename)||
      /^docs\/comun-(?:orch-v2-|product-objective-and-roadmap\.|roadmap-hourly-automation\.|escola)/i.test(f.filename)))
      throw Error('MERGE_NON_DOCS_OR_INCOMPLETE_DIFF');
  const runs=e.runs;
  if(!runs||!Array.isArray(runs.workflow_runs)||!Number.isSafeInteger(runs.total_count)||
    runs.total_count!==runs.workflow_runs.length||runs.total_count===0||
    runs.workflow_runs.some(r=>r.head_sha!==p.head.sha||r.event!=='pull_request'||
      r.status!=='completed'||(r.conclusion!=='success'&&
      !(r.conclusion==='skipped'&&DOCS_MERGE_ALLOWED_SKIPPED_WORKFLOWS.includes(r.name)))))
      throw Error('MERGE_WORKFLOWS_NOT_CERTIFIED');
  const ci=runs.workflow_runs.filter(r=>r.name==='COMUN CI'&&r.conclusion==='success');
  if(ci.length!==1)throw Error('MERGE_CI_EXACT_REQUIRED');
  const jobs=e.jobs;
  if(!jobs||!Array.isArray(jobs.jobs)||jobs.total_count!==jobs.jobs.length||!jobs.jobs.length)
    throw Error('MERGE_CI_JOBS_INCOMPLETE');
  const cost=jobs.jobs.filter(j=>j.name==='COST-02 / exact checkpoint Preview');
  if(cost.length!==1||cost[0].status!=='completed'||cost[0].conclusion!=='success'||
    cost[0].head_sha&&cost[0].head_sha!==p.head.sha)throw Error('MERGE_COST02_REQUIRED');
  if(!Array.isArray(e.reviews)||e.reviews.length>=100||
    e.reviews.some(r=>r.state==='CHANGES_REQUESTED'))
    throw Error('MERGE_REVIEW_BLOCKED');
  // Do not infer thread resolution from missing metadata. Any inline review
  // comment requires manual reconciliation outside this narrow lane.
  if(!Array.isArray(e.comments)||e.comments.length!==0)
    throw Error('MERGE_INLINE_REVIEW_NOT_CLEARED');
  const evidence={pr:p.number,head:p.head.sha,base:p.base.sha,
    files:files.map(f=>f.filename).sort(),
    workflows:runs.workflow_runs.map(r=>[r.name,r.id,r.conclusion])
      .sort((a,b)=>a[0].localeCompare(b[0])),
    cost02:cost[0].id??cost[0].name};
  return {pr:p.number,head_sha:p.head.sha,base_sha:p.base.sha,mode:'DOCS_ONLY',
    fingerprint:hash(evidence),files:evidence.files.length,ci_run:ci[0].id};
}

// Tier L is an admission contract, never an alternate mutation endpoint. The
// installed merge boundary remains DOCS_ONLY until a separate activation can
// prove the complete policy, provider evidence and main/Production behavior.
export function assessLowRiskMerge(e, policy, now = Date.now()) {
  const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
  const p = e?.pr;
  if (policy?.enabled !== true || policy.version !== 1 ||
      policy.scope !== 'LOW_RISK_CODE' || policy.source !== 'human-message' ||
      !digest(policy.evidence_sha) || !Array.isArray(policy.allowed_paths) ||
      !policy.allowed_paths.length) throw Error('LOW_RISK_POLICY_REQUIRED');
  if (!Number.isFinite(now) || !Number.isFinite(Date.parse(e?.observed_at)) ||
      Date.parse(e.observed_at) > now || now - Date.parse(e.observed_at) > 5 * 60000)
    throw Error('LOW_RISK_FRESH_EVIDENCE_REQUIRED');
  const safePath = value => typeof value === 'string' &&
    /^(?:components|lib)\/[a-zA-Z0-9_/-]+\.(?:ts|tsx)$/.test(value) &&
    !/auth|school|escola|permission|payment|billing|personal|migration|schema|rls|secret|env|release|captcha|admin|middleware|production/i.test(value);
  if (policy.allowed_paths.some(value => !safePath(value)))
    throw Error('LOW_RISK_POLICY_PATH_DENIED');
  const files = e?.files;
  if (!Array.isArray(files) || !files.length || files.length > 3 ||
      files.some(f => f.status !== 'modified' || !safePath(f.filename) ||
        !policy.allowed_paths.includes(f.filename) || typeof f.patch !== 'string' ||
        !Number.isSafeInteger(f.additions) || f.additions < 0 ||
        !Number.isSafeInteger(f.deletions) || f.deletions < 0) ||
      new Set(files.map(f => f.filename)).size !== files.length ||
      files.reduce((n, f) => n + f.additions + f.deletions, 0) > 100)
    throw Error('LOW_RISK_COMPLETE_SMALL_DIFF_REQUIRED');
  if (e.diff?.complete !== true || e.diff.head_sha !== p?.head?.sha ||
      e.diff.base_sha !== p?.base?.sha || e.diff.files_sha !== hash(files))
    throw Error('LOW_RISK_COMPLETE_SMALL_DIFF_REQUIRED');
  // Reuse the existing exact-head CI/COST/review contract without allowing a
  // code path through assessDocsMerge or the real DOCS_ONLY PUT boundary.
  const docsView = structuredClone(e);
  docsView.files = files.map((_, i) => ({ filename: `docs/tier-l-proof-${i}.md`, status: 'modified' }));
  const baseline = assessDocsMerge(docsView);
  const checks = e.checks;
  if (!checks || checks.complete !== true || checks.sha !== p.head.sha ||
      !Array.isArray(checks.required) || !checks.required.length ||
      new Set(checks.required).size !== checks.required.length ||
      !Array.isArray(checks.items) || !checks.items.length ||
      checks.items.some(c => c.sha !== p.head.sha || c.status !== 'completed' ||
        c.conclusion !== 'success') || checks.required.some(name =>
        checks.items.filter(c => c.name === name).length !== 1))
    throw Error('LOW_RISK_ALL_CHECKS_REQUIRED');
  const preview = e.preview;
  if (preview?.sha !== p.head.sha || preview.state !== 'READY' ||
      preview.source !== 'git' || preview.target !== 'preview' ||
      preview.branch !== p.head.ref || preview.project !== policy.preview_project ||
      typeof preview.id !== 'string' || !preview.id || !policy.preview_project)
    throw Error('LOW_RISK_EXACT_PREVIEW_REQUIRED');
  const contracts = e.contracts;
  if (!contracts || contracts.sha !== p.head.sha || contracts.diff_sha !== hash(files) ||
      contracts.policy_version !== policy.version ||
      contracts.focal_tests !== 'PASS' || contracts.quality !== 'PASS' ||
      contracts.sensitive_behavior_unchanged !== true || !digest(contracts.evidence_sha))
    throw Error('LOW_RISK_OWN_CONTRACTS_REQUIRED');
  if (e.production_effect?.base_sha !== p.base.sha ||
      e.production_effect?.result !== 'NO_PRODUCTION' ||
      !digest(e.production_effect?.evidence_sha))
    throw Error('LOW_RISK_PRODUCTION_EFFECT_UNVERIFIED');
  return { ...baseline, mode: 'LOW_RISK_CODE',
    fingerprint: hash({ evidence: e, policy }), mutation_enabled: false };
}
export function mergeExistingPullRequest(ctx,{owner_id,task_id,operation_id,pr_number,expected_head_sha},
  {read=readMergeEvidence,merge=mergeOnGitHub,
   readback=n=>mergeReadJSON('repos/'+COMUN_REPOSITORY+'/pulls/'+n),
   readMain=sha=>mergeReadJSON('repos/'+COMUN_REPOSITORY+'/compare/'+sha+'...main'),
   now=Date.now()}={}) {
  const proof=ownerProof(ctx,owner_id),loaded=loadState(ctx);
  const t=loaded.state.tasks.find(x=>x.task_id===task_id),policy=loaded.state.merge_policy;
  if(!t||t.status!=='RUNNING'||t.owner_id!==owner_id||!t.lease||
    t.lease.owner_proof!==proof||now>Date.parse(t.lease.deadline_at)||
    t.pr_effect!=='EXISTING_PR'||t.target_pr!==pr_number||t.work_class!=='INTEGRATION'||
    t.action!=='integrate-existing-pr'||t.inputs.sha!==expected_head_sha||
    !MERGE_SHA.test(expected_head_sha??'')||
    policy?.enabled!==true||policy?.scope!=='DOCS_ONLY'||policy?.source!=='human-message'||
    !policy.evidence_sha||t.merge_authorization?.scope!=='DOCS_ONLY'||
    t.merge_authorization?.evidence_sha!==policy.evidence_sha)
      throw Error('OWNED_AUTHORIZED_MERGE_LEASE_REQUIRED');
  if(!operation_id||t.operations.some(o=>o.state==='UNCERTAIN'||o.operation_id===operation_id||
    o.cycle_id===t.lease.cycle_id||
    o.action==='merge-pr'&&o.state==='APPLIED'))
      throw Error('RECONCILE_MERGE_BEFORE_REPEAT');
  // A docs-only diff does not prove that merging main cannot deploy Production.
  // Keep the effect closed until the human-sourced activation has recorded an
  // independently verified deployment configuration at this exact main SHA.
  if(policy.production_effect?.result!=='NO_PRODUCTION' ||
    !/^[a-f0-9]{64}$/.test(policy.production_effect?.evidence_sha??'') ||
    !MERGE_SHA.test(policy.production_effect?.base_sha??''))
    throw Error('MERGE_PRODUCTION_EFFECT_UNVERIFIED');
  const before=assessDocsMerge(read(pr_number));
  if(before.pr!==pr_number||before.head_sha!==expected_head_sha)throw Error('MERGE_HEAD_CHANGED');
  if(before.base_sha!==policy.production_effect.base_sha)
    throw Error('MERGE_PRODUCTION_BASE_CHANGED');
  const state=structuredClone(loaded.state);
  state.tasks.find(x=>x.task_id===task_id).operations.push({
    operation_id,action:'merge-pr',state:'UNCERTAIN',expected_sha:expected_head_sha,
    evidence_fingerprint:before.fingerprint,cycle_id:t.lease.cycle_id});
  state.revision++;saveState(ctx,state,loaded.expectedHash,owner_id);
  const intended=loadState(ctx);
  let fresh;
  try {fresh=assessDocsMerge(read(pr_number));}catch{fresh=null;}
  if(!fresh||fresh.fingerprint!==before.fingerprint||fresh.head_sha!==expected_head_sha){
    const stopped=structuredClone(intended.state);
    stopped.tasks.find(x=>x.task_id===task_id).operations.at(-1).state='NOT_APPLIED';
    stopped.revision++;saveState(ctx,stopped,intended.expectedHash,owner_id);
    throw Error('MERGE_EVIDENCE_CHANGED_BEFORE_EFFECT');
  }
  if(ownerProof(ctx,owner_id)!==proof||loadState(ctx).expectedHash!==intended.expectedHash||
    execFileSync('git',['-C',ctx.repo,'rev-parse','refs/comun/roadmap-execution'],
      {encoding:'utf8'}).trim()!==ctx.canonical)throw Error('MERGE_OWNERSHIP_CHANGED');
  // Timeout or failed readback leaves durable UNCERTAIN; never blind-retry.
  const result=merge(pr_number,expected_head_sha);
  if(result.merged!==true||!MERGE_SHA.test(result.sha??''))throw Error('MERGE_RESULT_UNCERTAIN');
  const verified=readback(pr_number);
  if(verified.state!=='closed'||verified.merged!==true||
    verified.merge_commit_sha!==result.sha||verified.head?.sha!==expected_head_sha)
    throw Error('MERGE_READBACK_UNCERTAIN');
  // PR metadata alone is insufficient; the merge commit must be on main.
  // A later, independently merged descendant is acceptable, divergence is not.
  const main=readMain(result.sha);
  if(!['ahead','identical'].includes(main?.status)||
    main.merge_base_commit?.sha!==result.sha||
    !MERGE_SHA.test(main.head_commit?.sha??''))
    throw Error('MERGE_MAIN_ANCESTRY_UNCERTAIN');
  const applied=structuredClone(intended.state);
  const appliedAt=new Date(now).toISOString();
  Object.assign(applied.tasks.find(x=>x.task_id===task_id).operations.at(-1),
    {state:'APPLIED',applied_at:appliedAt,merge_commit_sha:result.sha,
      evidence_sha:hash({before,sha:result.sha})});
  applied.delivery_metrics={...(applied.delivery_metrics??{}),
    last_material_delivery_at:appliedAt,last_material_delivery_sha:result.sha,
    last_material_delivery_task:task_id,
    delivery_count:(applied.delivery_metrics?.delivery_count??0)+1,
    merge_count:(applied.delivery_metrics?.merge_count??0)+1,
    last_merge_pr:pr_number};
  applied.revision++;saveState(ctx,applied,intended.expectedHash,owner_id);
  return {merged:true,pr:pr_number,sha:result.sha,head:expected_head_sha,scope:'DOCS_ONLY'};
}
