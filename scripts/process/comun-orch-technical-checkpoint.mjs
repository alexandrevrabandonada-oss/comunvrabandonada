// Proposed release source. Never loaded by the installed launcher.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {hash,task} from './comun-orch-v2.mjs';

export const TECHNICAL_RECIPE='TECHNICAL_PREVIEW_CHECKPOINT_V1';
export const CHECKPOINT_MESSAGE='chore(home): certify delivered focus candidate [comun-preview]';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

export function boundCheckpointGrant(grant,source,sourceHash,item) {
  return !!(grant?.source==='human-message'&&grant.revoked===false&&
    digest(grant.evidence_sha)&&grant.evidence_sha===sourceHash&&
    /^[a-z0-9-]+$/.test(grant.task_id??'')&&grant.task_id!==grant.station_id&&
    source?.source==='human-message'&&source.scope==='ONE_TECHNICAL_PREVIEW_CHECKPOINT_ONLY'&&
    source.consumed===false&&source.maximum_commits===1&&source.maximum_normal_pushes===1&&
    source.requires_original_executor_admission===true&&source.requires_owner_lease_cas===true&&
    source.product_ux_approval===false&&source.merge_authorized===false&&
    source.production_authorized===false&&source.rerun_authorized===false&&
    item?.completion_kind==='HUMAN_GATE'&&item.status==='BLOCKED_PROTECTED'&&
    grant.station_id===item.task_id&&grant.target_pr===item.target_pr&&
    source.target_pr===grant.target_pr&&Number.isSafeInteger(grant.target_pr)&&grant.target_pr>0&&
    grant.sha===item.sha&&grant.sha===source.expected_head&&sha(grant.sha)&&
    grant.branch===item.branch&&grant.branch===source.branch&&
    /^codex\/[a-zA-Z0-9/_-]+$/.test(grant.branch)&&!grant.branch.includes('..')&&
    Array.isArray(item.paths)&&item.paths.length===0);
}

export function checkpointTaskBound(t,grant) {
  return !!(t&&grant&&t.task_id===grant.task_id&&t.rail_station===grant.station_id&&
    t.rail_source_sha===grant.sha&&t.target_pr===grant.target_pr&&t.branch===grant.branch&&
    t.pr_effect==='EXISTING_PR'&&t.execution_base==='PR_HEAD'&&t.action==='local-code'&&
    t.work_class==='TECHNICAL_CHECKPOINT'&&t.technical_authorization_sha===grant.evidence_sha&&
    t.roadmap_item===undefined&&t.discovery?.recipe===TECHNICAL_RECIPE&&
    t.discovery.pr===grant.target_pr&&t.discovery.source_sha===grant.sha&&
    Array.isArray(t.discovery.paths)&&t.discovery.paths.length===0&&
    t.inputs?.contract===CHECKPOINT_MESSAGE&&
    (t.inputs.sha===grant.sha||t.lease?.base_sha===grant.sha));
}

export function checkpointGrantUsed(state,grant,exceptTask=null) {
  return state.tasks.some(t=>t.task_id!==exceptTask&&
    t.technical_authorization_sha===grant.evidence_sha);
}

export function checkpointAuthorized(ctx,state,t,{readFile=p=>fs.readFileSync(p,'utf8')}={}) {
  const grant=state.technical_checkpoint_grants?.find(g=>g.task_id===t?.task_id);
  if(!grant||!checkpointTaskBound(t,grant)||checkpointGrantUsed(state,grant,t.task_id)||
    t.operations?.some(o=>['UNCERTAIN','APPLIED'].includes(o.state)))return false;
  const item=ctx.checkpoint.roadmap_backlog?.items.find(i=>i.task_id===grant.station_id);
  try {
    const raw=readFile(grant.evidence_path);
    return boundCheckpointGrant(grant,JSON.parse(raw),hash(raw),item);
  }catch{return false;}
}

export function admitCheckpoint(ctx,state,rail,options={}) {
  if(rail.reason!=='ROADMAP_RAIL_EXTERNAL_GATE'||
    state.tasks.some(t=>t.status==='RUNNING'||t.operations.some(o=>o.state==='UNCERTAIN')))
    return state;
  const grants=state.technical_checkpoint_grants??[];
  if(!Array.isArray(grants))throw Error('TECHNICAL_CHECKPOINT_GRANTS_INVALID');
  const matches=grants.filter(g=>g.station_id===rail.station_id);
  if(matches.length>1)throw Error('TECHNICAL_CHECKPOINT_AMBIGUOUS');
  const grant=matches[0];
  if(!grant||state.tasks.some(t=>t.task_id===grant.task_id)||checkpointGrantUsed(state,grant))return state;
  const t=task({task_id:grant.task_id,priority:0,
    inputs:{sha:grant.sha,contract:CHECKPOINT_MESSAGE,authorization_sha:grant.evidence_sha},
    authorized:true,action:'local-code',work_class:'TECHNICAL_CHECKPOINT',
    rail_station:grant.station_id,rail_source_sha:grant.sha,target_pr:grant.target_pr,
    branch:grant.branch,execution_base:'PR_HEAD',pr_effect:'EXISTING_PR',
    technical_authorization_sha:grant.evidence_sha,
    discovery:{pr:grant.target_pr,source_sha:grant.sha,recipe:TECHNICAL_RECIPE,paths:[]}});
  if(!checkpointAuthorized(ctx,state,t,options))return state;
  return {...state,revision:state.revision+1,tasks:[...state.tasks,t]};
}

export function assertEmptyCheckpoint(t,candidate,{git=(...args)=>execFileSync('git',
  ['-C',t.lease.worktree,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()}={}) {
  if(!sha(candidate)||candidate===t.lease?.base_sha||
    git('rev-parse','HEAD')!==candidate||git('status','--porcelain')||
    git('rev-list','--parents','-n','1',candidate)!==`${candidate} ${t.lease.base_sha}`||
    git('rev-parse',`${candidate}^{tree}`)!==git('rev-parse',`${t.lease.base_sha}^{tree}`)||
    git('show','-s','--format=%B',candidate)!==CHECKPOINT_MESSAGE)
    throw Error('EXACT_EMPTY_CHECKPOINT_REQUIRED');
  return true;
}
