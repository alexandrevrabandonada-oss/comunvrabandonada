import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {hash,task,transition,plan} from './comun-orch-v2.mjs';
import {admitDiscovery,readDiscovery,replenish,discoveryDue,mergeDiscoveryDue,readMergeDiscovery,admitMergeDiscovery,replenishMergeDiscovery,MERGE_DISCOVERY_ID} from './comun-orch-discovery.mjs';
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
test('classifier upgrade re-triages first candidate once; unchanged contract retains rotation and retry budgets',()=>{
  const s=state([make('WAIT_EXTERNAL',{attempts_for_fingerprint:2})]);
  const empty={...source(),candidate:null};
  const prior={version:1,cursors:{'queue-discovery':{input_fingerprint:hash('old classifier'),scan_index:1,observation_fingerprint:hash('old'),no_change_count:1,read_failures:0}}};
  let cursor='not called';
  const first=replenish(s,{now:NOW,observer_control:prior,read:(_s,c)=>{cursor=c;return empty;}});
  assert.equal(cursor,undefined);assert.equal(first.state.tasks[0].attempts_for_fingerprint,2);
  const next=replenish(s,{now:NOW+1,observer_control:first.observer_control,read:(_s,c)=>{cursor=c;return empty;}});
  assert.equal(cursor.scan_index,1);assert.equal(next.state.tasks[0].status,'WAIT_EXTERNAL');
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
  const colored=()=> '2026-10-15T13:49:42Z [\x1b[33mwarn\x1b[39m] tests/experience-coherence/games-entry.spec.ts\x1b[0m\n[\x1b[33mwarn\x1b[39m] Code style issues found';
  const real=readDiscovery(state(),null,read,colored);
  assert.deepEqual(real.candidate.paths,['tests/experience-coherence/games-entry.spec.ts']);
  assert.equal(real.candidate.log_sha,hash(colored()));
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

const docsAuthorization={enabled:true,source:'human-message',scope:'DOCS_ONLY',
  evidence_sha:hash('human permission for docs-only fixture')};
const docsState=()=>({...state([make()]),merge_policy:docsAuthorization});
const docsMergeSource=()=>({repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),
  inventory:[{pr:550,sha:A,branch:'docs-pr',repository:REPOSITORY,base:'main'}],
  candidate:{pr:550,sha:A,base_sha:B,branch:'docs-pr',ci_run:11,cost_job:12,
    paths:['docs/product.md'],mode:'DOCS_ONLY',fingerprint:hash('verified docs evidence')},
  reason:'CERTIFIED_DOCUMENTAL_MERGE_CANDIDATE',scan_index:1,scan_complete:true});
test('bounded merge inventory admits one exact-head docs task, not a second task for same PR',()=>{
  const s=docsState(),next=admitMergeDiscovery(s,docsMergeSource(),NOW);
  assert.equal(s.tasks.length,1);
  assert.equal(next.tasks.length,2);
  assert.equal(next.tasks[1].action,'integrate-existing-pr');
  assert.equal(next.tasks[1].status,'READY');
  assert.equal(next.tasks[1].target_pr,550);
  assert.deepEqual(next.tasks[1].merge_authorization,
    {scope:'DOCS_ONLY',evidence_sha:docsAuthorization.evidence_sha});
  assert.equal(admitMergeDiscovery(next,docsMergeSource(),NOW).tasks.length,2);
  const blocked=structuredClone(s);delete blocked.merge_policy;
  assert.equal(mergeDiscoveryDue(blocked,NOW),false);
  assert.throws(()=>admitMergeDiscovery(blocked,docsMergeSource(),NOW),/AUTHORIZATION/);
  // Revoking the human policy must disable an already admitted READY merge.
  const revoked=structuredClone(next);delete revoked.merge_policy;
  assert.equal(mergeDiscoveryDue(revoked,NOW),false);
  assert.notEqual(next.tasks[1].authorized,false);
  assert.notEqual(revoked.tasks[1].authorized,false);
  assert.equal(plan(next,{now:NOW}).selected,next.tasks[1].task_id);
  assert.notEqual(plan(revoked,{now:NOW}).action,'EXECUTE');
});
test('bounded provider merge discovery checks exact CI/COST-02, diff and remote head',()=>{
  const pr={number:550,state:'open',draft:false,mergeable:true,changed_files:1,
    base:{ref:'main',sha:B,repo:{full_name:REPOSITORY}},
    head:{sha:A,ref:'docs-pr',repo:{full_name:REPOSITORY}}};
  const runs={total_count:1,workflow_runs:[{id:11,name:'COMUN CI',event:'pull_request',
    head_sha:A,status:'completed',conclusion:'success'}]};
  const jobs={total_count:1,jobs:[{id:12,name:'COST-02 / exact checkpoint Preview',
    status:'completed',conclusion:'success'}]};
  const data=new Map([
    ['repos/'+REPOSITORY+'/pulls?state=open&per_page=100&sort=updated&direction=desc',[pr]],
    ['repos/'+REPOSITORY+'/pulls/550',pr],
    ['repos/'+REPOSITORY+'/pulls/550/files?per_page=100',
      [{filename:'docs/product.md',status:'modified'}]],
    ['repos/'+REPOSITORY+'/actions/runs?head_sha='+A+'&event=pull_request&per_page=100',runs],
    ['repos/'+REPOSITORY+'/actions/runs/11/jobs?filter=latest&per_page=100',jobs],
    ['repos/'+REPOSITORY+'/pulls/550/reviews?per_page=100',[]],
    ['repos/'+REPOSITORY+'/pulls/550/comments?per_page=100',[]],
  ]);
  const read=k=>{assert(data.has(k),'Unexpected route '+k);return data.get(k);};
  const good=readMergeDiscovery(docsState(),null,read);
  assert.equal(good.candidate.pr,550);
  assert.equal(good.candidate.sha,A);
  const unknownSkip=new Map(data);
  unknownSkip.set('repos/'+REPOSITORY+'/actions/runs?head_sha='+A+'&event=pull_request&per_page=100',
    {...runs,total_count:2,workflow_runs:[...runs.workflow_runs,
      {id:14,name:'Some required workflow',event:'pull_request',head_sha:A,
        status:'completed',conclusion:'skipped'}]});
  assert.equal(readMergeDiscovery(docsState(),null,k=>unknownSkip.get(k)).candidate,null);
  const allowedSkip=new Map(data);
  allowedSkip.set('repos/'+REPOSITORY+'/actions/runs?head_sha='+A+'&event=pull_request&per_page=100',
    {...runs,total_count:2,workflow_runs:[...runs.workflow_runs,
      {id:15,name:'COMUN PR437 Promotion Fingerprint',event:'pull_request',head_sha:A,
        status:'completed',conclusion:'skipped'}]});
  assert.equal(readMergeDiscovery(docsState(),null,k=>allowedSkip.get(k)).candidate.pr,550);
  const unsafe=new Map(data);unsafe.set('repos/'+REPOSITORY+'/pulls/550/files?per_page=100',
    [{filename:'app/page.tsx',status:'modified'}]);
  assert.equal(readMergeDiscovery(docsState(),null,k=>unsafe.get(k)).candidate,null);
  const stale=new Map(data);stale.set('repos/'+REPOSITORY+'/pulls/550',
    {...pr,head:{...pr.head,sha:B}});
  assert.throws(()=>readMergeDiscovery(docsState(),null,k=>stale.get(k)),/MERGE_HEAD_MOVED/);
  const failed=new Map(data);failed.set('repos/'+REPOSITORY+'/actions/runs/11/jobs?filter=latest&per_page=100',
    {...jobs,jobs:[{...jobs.jobs[0],conclusion:'failure'}]});
  assert.equal(readMergeDiscovery(docsState(),null,k=>failed.get(k)).candidate,null);
});
test('single locked tick turns verified docs intake into lease without a worktree, never a merge effect',()=>{
  const f=fixture(),docState=docsState();
  try {
    const checkpoint={remote:REMOTE,common:f.ctx.common,canonical:f.ctx.canonical,state:docState};
    fs.mkdirSync(path.dirname(f.ctx.ledger),{recursive:true});
    fs.writeFileSync(f.ctx.ledger,JSON.stringify(checkpoint));
    const originalRef=f.git('rev-parse',REF);
    const r=tick(f.ctx,{now:NOW,discoverMerge:()=>docsMergeSource(),
      discover:()=>assert.fail('repair discovery should not execute')});
    assert.equal(r.action,'EXECUTE');
    assert.equal(r.task.target_pr,550);
    assert.equal(r.task.action,'integrate-existing-pr');
    assert.equal(r.worktree,null);
    assert.equal(r.worktrees,0);
    assert(r.owner_id);
    assert.equal(loadState(f.ctx).state.tasks.filter(t=>t.action==='integrate-existing-pr').length,1);
    assert.equal(f.git('rev-parse',REF),originalRef);
    record(f.ctx,{owner_id:r.owner_id,task_id:r.task.task_id,event:{type:'cycle-complete'}});
    assert.equal(inspectLock(f.ctx.common).state,'FREE');
    assert.equal(loadState(f.ctx).state.tasks.filter(t=>t.action==='integrate-existing-pr').length,1);
  }finally{f.cleanup();}
});
