// The PR mutation boundary. Never use planner snapshots as admission authority.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {classifyPrAdmission,COMUN_REPOSITORY} from './orch-v2-candidate.mjs';
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
