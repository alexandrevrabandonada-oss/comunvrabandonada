import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {hash,task,transition} from './comun-orch-v2.mjs';
import {admitDiscovery,readDiscovery,replenish,discoveryDue} from './comun-orch-discovery.mjs';
import {context,tick,loadState,record,acquireLock,releaseLock,saveState,inspectLock,REMOTE,REF} from './comun-orch-runtime.mjs';
import {REPOSITORY} from './comun-orch-reconcile.mjs';
const NOW=Date.now(), A='a'.repeat(40), B='b'.repeat(40);
const authorization={source:'human-message',scope:'existing-pr-code-repair',evidence_sha:hash('explicit fixture authorization'),no_new_prs:true};
const state=(tasks=[])=>({schema_version:2,revision:0,tasks,queue_discovery:{authorization},integration_debt:{no_new_prs:true}});
const evidence=(sha=A)=>({repository:REPOSITORY,pr:551,sha,branch:'existing',run:22,job:33,attempt:1,workflow:'COMUN Experience Coherence',
  paths:['tests/experience-coherence/games-entry.spec.ts'],log_sha:hash('failed format log'),recipe:'PRETTIER_TEST_ONLY',scope:'Formatting only; other checks unverified'});
const source=(sha=A)=>({repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),inventory:[{pr:551,sha,branch:'existing',repository:REPOSITORY}],candidate:evidence(sha),reason:'PROVEN_EXISTING_BRANCH_REPAIR',scan_index:1});
const make=(status='WAIT_HUMAN',more={})=>task({task_id:'protected',priority:1,status,inputs:{sha:A},...more});
function fixture(){
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'comun-discovery-'));
  const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');git('remote','add','origin',REMOTE);
  fs.mkdirSync(path.join(repo,'reports/current'),{recursive:true});
  fs.writeFileSync(path.join(repo,'reports/current/comun-execution-checkpoint.json'),JSON.stringify({legacy:{keep:true},orchV2:state([make()])}));
  git('add','.');git('commit','-m','fixture');git('update-ref',REF,'HEAD');
  const ctx=context(repo);
  return {repo,ctx,git,cleanup(){assert(path.resolve(repo).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(repo,{recursive:true});}};
}
test('empty queue admits exactly one existing-PR task with own SHA/evidence/authorization; never reopens DONE',()=>{
  const done=transition(state([task({task_id:'old',priority:1,inputs:{sha:A}})]),'old',
    {type:'result',sha:A,input_fingerprint:hash({sha:A}),result:'PASS',scope:'old',evidence_sha:hash('old')},NOW);
  const next=admitDiscovery(done,source(),NOW);assert.equal(next.tasks.length,2);assert.deepEqual(next.tasks[0],done.tasks[0]);
  assert.equal(next.tasks[1].target_pr,551);assert.equal(next.tasks[1].status,'READY');assert.equal(next.tasks[1].execution_base,'PR_HEAD');
  assert.deepEqual(next.tasks[1].discovery.authorization,authorization);assert.equal(next.tasks[1].inputs.sha,A);
});
test('dedup ignores changed run, timestamp and logs for same PR/SHA/path finding, including DONE',()=>{
  let s=admitDiscovery(state(),source(),NOW),t=s.tasks[0];
  s=transition(s,t.task_id,{type:'result',sha:A,input_fingerprint:t.input_fingerprint,result:'PASS',scope:'format only',evidence_sha:hash('own proof')},NOW);
  const another=source();another.candidate.run++;another.candidate.log_sha=hash('other noise');
  assert.equal(admitDiscovery(s,another,NOW+1),s);assert.equal(admitDiscovery(s,source(),NOW+2).tasks.length,1);
});
test('absence of permission is fail closed with zero provider reads; new SHA never bypasses protected PR',()=>{
  const s=state();delete s.queue_discovery;assert.equal(discoveryDue(s,NOW),false);
  assert.throws(()=>admitDiscovery(s,source(),NOW),/AUTHORIZATION/);
  for(const status of ['WAIT_HUMAN','BLOCKED_PROTECTED']){
    const p=state([make(status,{target_pr:551,pr_effect:'EXISTING_PR'})]);
    assert.throws(()=>admitDiscovery(p,source(B),NOW),/PROTECTED_PR/);assert.equal(p.tasks[0].status,status);
  }
});
test('unsafe paths, stale head, fork, incomplete evidence and uncertain operation cannot enter queue',()=>{
  for(const change of [s=>s.complete=false,s=>s.candidate.sha=B,s=>s.candidate.recipe='MERGE',
    s=>s.candidate.paths=['tests/escola/auth.ts'],s=>s.candidate.paths=['tests/../secrets.ts'],s=>s.candidate.branch='--bad',
    s=>s.inventory[0].repository='fork/repo',s=>s.candidate.log_sha='missing']){
    const x=source();change(x);assert.throws(()=>admitDiscovery(state(),x,NOW),/SCOPE|INVENTORY/);
  }
  assert.throws(()=>admitDiscovery(state([make('WAIT_EXTERNAL',{operations:[{state:'UNCERTAIN'}]})]),source(),NOW),/INTERRUPTED/);
});
test('two unchanged cycles read once within cooldown and notify blocker once even after rotation',()=>{
  const empty={...source(),candidate:null,scan_complete:true,reason:'NO_SUPPORTED_REPAIR_EVIDENCE',needed:'Scoped reproducible repair'};
  let reads=0;const first=replenish(state(),{now:NOW,read:()=>{reads++;return empty;}});
  assert.equal(first.state.tasks.length,0);assert.equal(first.notifications.length,1);
  assert.equal(discoveryDue(state(),NOW+40*60000,first.observer_control),false);
  const second=replenish(state(),{now:NOW+4*3600000,observer_control:first.observer_control,read:()=>{reads++;return {...empty,observed_at:new Date(NOW+4*3600000).toISOString(),inventory:[]};}});
  assert.equal(second.notifications.length,0);assert.equal(second.state.revision,0);assert.equal(reads,2);
});
test('two equivalent read failures suspend for a day; recovery preserves execution budgets and authorization',()=>{
  let c;const s=state([make('WAIT_EXTERNAL',{attempts_for_fingerprint:2})]);
  for(let i=0;i<2;i++){const r=replenish(s,{now:NOW+i*4*3600000,observer_control:c,read:()=>{throw Error('HTTP 403');}});c=r.observer_control;assert.equal(r.state,s);}
  assert(c.cursors['queue-discovery'].suspended);const due=Date.parse(c.cursors['queue-discovery'].next_probe_at);
  assert(!discoveryDue(s,due-1,c));
  const r=replenish(s,{now:due,observer_control:c,read:()=>({...source(),observed_at:new Date(due).toISOString(),candidate:null})});
  assert.equal(r.observer_control.cursors['queue-discovery'].read_failures,0);assert.equal(r.state.tasks[0].attempts_for_fingerprint,2);
});
test('reader binds latest exact workflow/job/log and readback; older failure cannot supersede newer success',()=>{
  const p={number:551,state:'open',base:{ref:'main',repo:{full_name:REPOSITORY}},head:{sha:A,ref:'existing',repo:{full_name:REPOSITORY}}};
  const r={id:22,workflow_id:1,name:'COMUN Experience Coherence',run_attempt:1,head_sha:A,event:'pull_request',repository:{full_name:REPOSITORY},status:'completed',conclusion:'failure'};
  const j={id:33,run_id:22,head_sha:A,conclusion:'failure',steps:[{name:'Check formatted files',conclusion:'failure'}]};
  const read=route=>route.includes('?state=open')?[p]:route.includes('/actions/runs?')?{total_count:1,workflow_runs:[r]}:
    route.includes('/jobs?')?{total_count:1,jobs:[j]}:p;
  const log=()=> '[warn] tests/experience-coherence/games-entry.spec.ts\n[warn] Code style issues found';
  assert.equal(readDiscovery(state(),null,read,log).candidate.sha,A);
  assert.equal(readDiscovery(state(),null,route=>route.includes('/actions/runs?')?{total_count:2,workflow_runs:[r,{...r,id:23,conclusion:'success'}]}:read(route),log).candidate,null);
  assert.throws(()=>readDiscovery(state(),null,route=>route.endsWith('/pulls/551')?{...p,head:{...p.head,sha:B}}:read(route),log),/HEAD_MOVED/);
});
test('runtime replenishment flows into isolated EXECUTE on actual PR base; interrupted second tick preserves lease and no duplicate admission',()=>{
  const f=fixture();let result;try{
    const real=f.git('rev-parse','HEAD');let reads=0;
    result=tick(f.ctx,{now:NOW,worktreeRoot:path.join(f.repo,'cycles'),discover:()=>{reads++;return source(real);},resolveExecutionBase:()=>real});
    assert.equal(result.action,'EXECUTE');assert.equal(result.task.target_pr,551);assert.equal(result.task.lease.base_sha,real);
    assert.equal(execFileSync('git',['-C',result.worktree,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),real);
    const bytes=fs.readFileSync(f.ctx.ledger);
    const second=tick(f.ctx,{now:NOW+1,discover:()=>{throw Error('must not rediscover');}});
    assert.equal(second.reason,'HELD_LIVE');assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert.equal(reads,1);
    record(f.ctx,{owner_id:result.owner_id,task_id:result.selected,now:NOW+1,event:{type:'cycle-complete'}});
    assert.equal(inspectLock(f.ctx.common).state,'FREE');
  }finally{if(result?.worktree)f.git('worktree','remove',result.worktree);f.cleanup();}
});
test('admission CAS rejects stale ledger and concurrent canonical ref without losing existing blockers',()=>{
  const f=fixture();try{
    acquireLock(f.ctx.common,'cas');const loaded=loadState(f.ctx),next=admitDiscovery(loaded.state,source(),NOW);
    saveState(f.ctx,loaded.state,loaded.expectedHash,'cas');
    assert.throws(()=>saveState(f.ctx,next,loaded.expectedHash,'cas'),/ALREADY_EXISTS/);
    const fresh=loadState(f.ctx);fs.writeFileSync(path.join(f.repo,'winner.txt'),'winner');f.git('add','.');f.git('commit','-m','winner');f.git('update-ref',REF,'HEAD',f.ctx.canonical);
    assert.throws(()=>saveState(f.ctx,next,fresh.expectedHash,'cas'),/CANONICAL_CAS/);
    assert.equal(JSON.parse(fs.readFileSync(f.ctx.ledger)).state.tasks[0].status,'WAIT_HUMAN');
  }finally{releaseLock(f.ctx.common,'cas');f.cleanup();}
});
test('two real legitimate NOOP cycles preserve ledger/ref/worktrees; observation is not a material delivery',()=>{
  const f=fixture();try{
    const empty={...source(),candidate:null,reason:'NO_SUPPORTED_REPAIR_EVIDENCE',needed:'Exact reproducible safe finding'};
    let r=tick(f.ctx,{now:NOW,discover:()=>empty});const bytes=fs.readFileSync(f.ctx.ledger),ref=f.git('rev-parse',REF),wt=f.git('worktree','list','--porcelain');
    const c=r.observer_control;
    for(let i=1;i<=2;i++){r=tick(f.ctx,{now:NOW+i,observer_control:c,discover:()=>{throw Error('cooldown');}});
      assert.equal(r.action,'NOOP');assert.equal(r.writes,0);assert.equal(r.worktrees,0);assert.equal(r.notify,false);assert.equal(r.progress.last_material_delivery_at,null);}
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert.equal(f.git('rev-parse',REF),ref);assert.equal(f.git('worktree','list','--porcelain'),wt);
  }finally{f.cleanup();}
});
test('interruption after admission persistence leaves one owned RUNNING lease and original lock for reconciliation',()=>{
  const f=fixture();try{
    const runtime=new URL('./comun-orch-runtime.mjs',import.meta.url).href;
    const code=`import fs from 'node:fs';import {context,tick} from ${JSON.stringify(runtime)};fs.existsSync=(original=>p=>String(p).includes('cycles')?true:original(p))(fs.existsSync);tick(context(${JSON.stringify(f.repo)}),{worktreeRoot:${JSON.stringify(path.join(f.repo,'cycles'))},discover:()=>(${JSON.stringify(source(f.git('rev-parse','HEAD')))}),resolveExecutionBase:()=>${JSON.stringify(f.git('rev-parse','HEAD'))}});`;
    const child=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});
    assert.notEqual(child.status,0);assert.match(child.stderr,/ISOLATION_PATH_INVALID/);
    assert.equal(loadState(f.ctx).state.tasks.filter(t=>t.status==='RUNNING').length,1);
    assert.equal(tick(f.ctx).reason,'ORPHAN_UNKNOWN');
  }finally{f.cleanup();}
});
