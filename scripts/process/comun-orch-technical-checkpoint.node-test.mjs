import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {hash,transition} from './comun-orch-v2.mjs';
import {boundCheckpointGrant,admitCheckpoint,assertEmptyCheckpoint,CHECKPOINT_MESSAGE,
  checkpointAuthorized} from './comun-orch-technical-checkpoint.mjs';
import {scopeRailTasks,selectRailStation} from './comun-orch-rail.mjs';
import {context,tick,record,loadState,inspectLock,releaseLock,saveState,REMOTE,REF} from './comun-orch-runtime.mjs';
const source={source:'human-message',scope:'ONE_TECHNICAL_PREVIEW_CHECKPOINT_ONLY',
    expected_head:'a'.repeat(40),target_pr:554,branch:'codex/home-test',consumed:false,
    maximum_commits:1,maximum_normal_pushes:1,requires_original_executor_admission:true,
    requires_owner_lease_cas:true,product_ux_approval:false,merge_authorized:false,
    production_authorized:false,rerun_authorized:false};
function setup(head=source.expected_head){
 const s={...source,expected_head:head},raw=JSON.stringify(s),evidence_sha=hash(raw);
 const item={task_id:'home-public-discovery-human-validation',status:'BLOCKED_PROTECTED',completion_kind:'HUMAN_GATE',
   sha:head,target_pr:554,branch:source.branch,paths:[],proof_requirements:['real-human-proof']};
 const grant={task_id:'home-preview-technical-checkpoint',station_id:item.task_id,source:'human-message',
   evidence_sha,evidence_path:'synthetic-authorization.json',revoked:false,sha:head,target_pr:554,branch:source.branch};
 const backlog={version:1,rail:{version:1,mode:'SINGLE_TRACK',completion_policy:'MATERIAL_AND_PASS',station_ids:[item.task_id]},items:[item]};
 const state={schema_version:2,revision:0,tasks:[],technical_checkpoint_grants:[grant]};
 const ctx={checkpoint:{roadmap_backlog:backlog}};
 return {s,raw,item,grant,backlog,state,ctx,options:{readFile:()=>raw},rail:selectRailStation(backlog,state)};
}
test('exact grant admits only technical child; parent HUMAN_GATE remains incomplete',()=>{
 const f=setup(),before=structuredClone(f.state),next=admitCheckpoint(f.ctx,f.state,f.rail,f.options);
 assert.deepEqual(f.state,before);assert.equal(next.tasks.length,1);assert.equal(next.tasks[0].roadmap_item,undefined);
 assert.equal(next.tasks[0].work_class,'TECHNICAL_CHECKPOINT');
 assert.equal(selectRailStation(f.backlog,next).reason,'ROADMAP_RAIL_EXTERNAL_GATE');
 assert.equal(scopeRailTasks(f.backlog,next).state.tasks[0].authorized,true);
});
for(const [name,change] of Object.entries({
 revoked:f=>f.grant.revoked=true,
 moved_head:f=>f.item.sha='b'.repeat(40),
 other_branch:f=>f.grant.branch='codex/other',
 other_pr:f=>f.grant.target_pr=556,
 consumed:f=>{f.s.consumed=true;},
 excessive_pushes:f=>{f.s.maximum_normal_pushes=2;},
 no_owner:f=>{f.s.requires_owner_lease_cas=false;},
 merge_permission:f=>{f.s.merge_authorized=true;},
 missing_human_source:f=>{f.s.source='timer';},
 changed_station_kind:f=>f.item.completion_kind='CODE_PUSH',
 runtime_paths:f=>f.item.paths=['components/x.tsx'],
 forged_hash:f=>f.grant.evidence_sha='0'.repeat(64)
}))test(`reject ${name} without admitting task`,()=>{
 const f=setup();change(f);const raw=JSON.stringify(f.s);
 assert.equal(boundCheckpointGrant(f.grant,f.s,hash(raw),f.item),false);
 assert.equal(admitCheckpoint(f.ctx,f.state,f.rail,{readFile:()=>raw}),f.state);
});
test('fail closed on unreadable, malformed or changed authorization bytes',()=>{
 const f=setup();for(const readFile of [()=>{throw Error('missing');},()=>'{',()=>f.raw+' '])
   assert.equal(admitCheckpoint(f.ctx,f.state,f.rail,{readFile}),f.state);
});
test('no duplicate consumption, including ambiguous grants and an interrupted operation',()=>{
 const f=setup(),next=admitCheckpoint(f.ctx,f.state,f.rail,f.options);
 assert.equal(admitCheckpoint(f.ctx,next,f.rail,f.options),next);
 const duplicate=structuredClone(f.state);duplicate.technical_checkpoint_grants.push({...f.grant,task_id:'other'});
 assert.throws(()=>admitCheckpoint(f.ctx,duplicate,f.rail,f.options),/AMBIGUOUS/);
 const interrupted=structuredClone(next);interrupted.tasks[0].operations.push({state:'UNCERTAIN'});
 assert.equal(admitCheckpoint(f.ctx,interrupted,f.rail,f.options),interrupted);
});
test('revocation is rechecked after admission and scope masks the task',()=>{
 const f=setup(),next=admitCheckpoint(f.ctx,f.state,f.rail,f.options),t=next.tasks[0];
 next.technical_checkpoint_grants[0].revoked=true;
 assert.equal(checkpointAuthorized(f.ctx,next,t,f.options),false);
 assert.equal(scopeRailTasks(f.backlog,next).state.tasks[0].authorized,false);
});
test('forged code path, recipe or station never receives rail authorization',()=>{
 for(const change of [t=>t.discovery.paths.push('components/x.tsx'),t=>t.discovery.recipe='OTHER',
   t=>t.rail_station='other',t=>t.work_class='IMPLEMENTATION']){
  const f=setup(),next=admitCheckpoint(f.ctx,f.state,f.rail,f.options);change(next.tasks[0]);
  assert.equal(scopeRailTasks(f.backlog,next).state.tasks[0].authorized,false);
 }
});
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comun-technical-checkpoint-'));
 const git=(...a)=>execFileSync('git',['-C',dir,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git('init');git('config','user.name','Checkpoint test');git('config','user.email','test@example.invalid');
 git('remote','add','origin',REMOTE);fs.writeFileSync(path.join(dir,'product.txt'),'unchanged');
 git('add','.');git('commit','-m','material fixture');const head=git('rev-parse','HEAD');
 const f=setup(head);const proof=path.join(dir,'human-source.json');fs.writeFileSync(proof,f.raw);f.grant.evidence_path=proof;
 fs.mkdirSync(path.join(dir,'reports/current'),{recursive:true});
 fs.writeFileSync(path.join(dir,'reports/current/comun-execution-checkpoint.json'),JSON.stringify({
  orchV2:f.state,roadmap_backlog:f.backlog}));git('add','.');git('commit','-m','canonical fixture');git('update-ref',REF,'HEAD');
 return {...f,dir,git,head,ctx:context(dir),cleanup(){assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true});}};
}
test('original runtime claims child with real owner/lease/worktree in disposable repository; no network',()=>{
 const f=fixture();let claimed;
 try{
  claimed=tick(f.ctx,{worktreeRoot:path.join(f.dir,'cycles'),resolveExecutionBase:()=>f.head,reconcile:false});
  assert.equal(claimed.action,'EXECUTE');assert.equal(claimed.task.task_id,f.grant.task_id);
  const state=loadState(f.ctx).state,t=state.tasks[0];assert.equal(t.status,'RUNNING');assert(t.lease.owner_proof);
  assert.equal(inspectLock(f.ctx.common).state,'HELD_LIVE');
  assert.equal(selectRailStation(f.backlog,state).reason,'ROADMAP_RAIL_EXTERNAL_GATE');
  assert.throws(()=>record(f.ctx,{owner_id:claimed.owner_id,task_id:t.task_id,event:{type:'result',
   sha:t.inputs.sha,input_fingerprint:t.input_fingerprint,result:'PASS',evidence_sha:hash('unproven'),scope:'technical'}}),/APPLIED_REQUIRED/);
  record(f.ctx,{owner_id:claimed.owner_id,task_id:t.task_id,event:{type:'cycle-complete'}});
  assert.equal(inspectLock(f.ctx.common).state,'FREE');
 }finally{if(claimed?.owner_id)releaseLock(f.ctx.common,claimed.owner_id);
  if(claimed?.worktree)f.git('worktree','remove',claimed.worktree);f.cleanup();}
});
test('real Git candidate must be one empty commit with exact message; code and extra parent rejected',()=>{
 const f=fixture();try{
  const base=f.git('rev-parse','HEAD');f.git('commit','--allow-empty','-m',CHECKPOINT_MESSAGE);
  const candidate=f.git('rev-parse','HEAD'),t={lease:{base_sha:base,worktree:f.dir}};
  assertEmptyCheckpoint(t,candidate);
  f.git('commit','--allow-empty','-m',CHECKPOINT_MESSAGE);
  assert.throws(()=>assertEmptyCheckpoint(t,f.git('rev-parse','HEAD')),/EXACT_EMPTY/);
  fs.writeFileSync(path.join(f.dir,'product.txt'),'changed');f.git('add','.');
  const parent=f.git('rev-parse','HEAD');f.git('commit','-m',CHECKPOINT_MESSAGE);
  assert.throws(()=>assertEmptyCheckpoint({lease:{base_sha:parent,worktree:f.dir}},f.git('rev-parse','HEAD')),/EXACT_EMPTY/);
 }finally{f.cleanup();}
});
test('end to end local-only push is APPLIED exactly once; functional delivery counter and HUMAN_GATE stay unchanged',()=>{
 const f=fixture();let claimed;try{
  const remote=path.join(f.dir,'remote.git');f.git('clone','--bare',f.dir,remote);
  execFileSync('git',['--git-dir',remote,'update-ref',`refs/heads/${f.grant.branch}`,f.head],{stdio:'pipe'});
  claimed=tick(f.ctx,{worktreeRoot:path.join(f.dir,'cycles'),resolveExecutionBase:()=>f.head,reconcile:false});
  assert.equal(claimed.action,'EXECUTE');
  // Rewrite only this disposable fixture's remote transport, never the product repository.
  f.git('config',`url.${remote.replaceAll('\\','/')}.insteadOf`,REMOTE);
  const wg=(...a)=>execFileSync('git',['-C',claimed.worktree,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  wg('commit','--allow-empty','-m',CHECKPOINT_MESSAGE);const candidate=wg('rev-parse','HEAD');
  const event=event=>record(f.ctx,{owner_id:claimed.owner_id,task_id:f.grant.task_id,event});
  event({type:'candidate',sha:candidate});
  let loaded=loadState(f.ctx),s=structuredClone(loaded.state);
  s.delivery_metrics={delivery_count:6,last_material_delivery_sha:f.head,last_material_delivery_at:'2026-10-19T15:33:57.605Z'};
  saveState(f.ctx,s,loaded.expectedHash,claimed.owner_id);const metrics=structuredClone(s.delivery_metrics);
  event({type:'operation-intent',operation_id:'fixture-technical-once',action:'normal-code-push',expected_sha:candidate});
  wg('push','origin',`HEAD:refs/heads/${f.grant.branch}`);
  assert.equal(wg('ls-remote','--heads','origin',`refs/heads/${f.grant.branch}`).split(/\s/)[0],candidate);
  event({type:'reconcile-operation',operation_id:'fixture-technical-once',expected_sha:candidate,result:'APPLIED',evidence_sha:hash(candidate)});
  loaded=loadState(f.ctx);const t=loaded.state.tasks[0];assert.deepEqual(loaded.state.delivery_metrics,metrics);
  assert.equal(checkpointAuthorized(f.ctx,loaded.state,t),false,'authorization is spent for another operation');
  event({type:'result',sha:candidate,input_fingerprint:t.input_fingerprint,result:'PASS',scope:'Technical checkpoint publication only',evidence_sha:hash('own fixture readback')});
  const after=loadState(f.ctx).state;assert.equal(after.tasks[0].status,'DONE');assert.equal(after.tasks[0].operations.length,1);
  assert.equal(selectRailStation(f.backlog,after).reason,'ROADMAP_RAIL_EXTERNAL_GATE');
  assert.deepEqual(after.delivery_metrics,metrics);assert.equal(inspectLock(f.ctx.common).state,'FREE');
  assert.equal(admitCheckpoint(f.ctx,after,f.rail),after);
 }finally{if(claimed?.owner_id)releaseLock(f.ctx.common,claimed.owner_id);
  if(claimed?.worktree)f.git('worktree','remove',claimed.worktree);f.cleanup();}
});
