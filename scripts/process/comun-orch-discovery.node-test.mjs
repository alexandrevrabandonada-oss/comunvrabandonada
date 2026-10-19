import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {hash,task,transition,plan} from './comun-orch-v2.mjs';
import {admitDiscovery,readDiscovery,replenish,discoveryDue,mergeDiscoveryDue,readMergeDiscovery,admitMergeDiscovery,replenishMergeDiscovery,MERGE_DISCOVERY_ID,chooseDiscoveryLane,readRoadmapDiscovery,admitRoadmapDiscovery,roadmapAuthorized,standingBuildPolicy} from './comun-orch-discovery.mjs';
import {context,tick,loadState,record,acquireLock,releaseLock,saveState,inspectLock,REMOTE,REF} from './comun-orch-runtime.mjs';
import {REPOSITORY} from './comun-orch-reconcile.mjs';
const NOW=Date.now(), A='a'.repeat(40), B='b'.repeat(40);
const authorization={source:'human-message',scope:'existing-pr-code-repair',evidence_sha:hash('explicit fixture authorization'),no_new_prs:true};
const state=(tasks=[])=>({schema_version:2,revision:0,tasks,queue_discovery:{authorization},integration_debt:{no_new_prs:true}});
const evidence=(sha=A)=>({repository:REPOSITORY,pr:551,sha,branch:'existing',run:22,job:33,attempt:1,workflow:'COMUN Experience Coherence',
  paths:['tests/experience-coherence/games-entry.spec.ts'],log_sha:hash('failed format log'),recipe:'PRETTIER_TEST_ONLY',scope:'Formatting only; other checks unverified'});
const source=(sha=A)=>({repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),inventory:[{pr:551,sha,branch:'existing',repository:REPOSITORY}],candidate:evidence(sha),reason:'PROVEN_EXISTING_BRANCH_REPAIR',scan_index:1});
const make=(status='WAIT_HUMAN',more={})=>task({task_id:'protected',priority:1,status,inputs:{sha:A},...more});

function roadmapFixture() {
  const item={task_id:'roadmap-search-labels',priority:5,status:'READY',target_pr:554,
    sha:A,branch:'existing-search',roadmap_heading:'## Search labels',
    paths:['lib/search/labels.ts'],test_criteria:['Preserve query and submit behavior'],dependencies:[]};
  const grant={task_id:item.task_id,source:'human-message',evidence_sha:hash('specific human grant'),criteria_sha:hash(item)};
  const s=state();s.roadmap_discovery={enabled:true,scope:'EXISTING_PR_ROADMAP',
    source:'human-message',evidence_sha:hash('human intake policy'),grants:[grant]};
  const checkpoint={roadmap_backlog:{items:[item]}};
  const ctx={repo:'fixture',canonical:B};
  const read=args=>args[0]==='rev-parse'?B:args[1].endsWith('.json')?
    JSON.stringify(checkpoint):'# Canonical roadmap\n## Search labels\n';
  return {s,item,grant,checkpoint,ctx,read};
}

test('roadmap intake references canonical source and exact human criteria, never creates a PR',()=>{
  const f=roadmapFixture(),source=readRoadmapDiscovery(f.ctx,f.s,f.read);
  assert.equal(source.reason,'AUTHORIZED_CANONICAL_ROADMAP_ITEM');
  const next=admitRoadmapDiscovery(f.s,source),t=next.tasks[0];
  assert.equal(t.pr_effect,'EXISTING_PR');assert.equal(t.target_pr,554);
  assert.equal(t.execution_base,'PR_HEAD');assert.equal(t.discovery.recipe,'ROADMAP_SCOPED_BUILD');
  assert.deepEqual(t.inputs.contract,f.item.test_criteria);
  assert.equal(admitRoadmapDiscovery(next,source),next);
  assert.equal(readRoadmapDiscovery(f.ctx,next,f.read).candidate,null);
});

test('roadmap documentation alone, changed criteria and revoked grants authorize nothing',()=>{
  const f=roadmapFixture();delete f.s.roadmap_discovery;
  assert.equal(readRoadmapDiscovery(f.ctx,f.s,()=>assert.fail('no Git reads')).reason,'ROADMAP_HUMAN_POLICY_REQUIRED');
  for(const change of [f=>f.grant.revoked=true,f=>f.item.test_criteria=['changed scope'],
    f=>f.item.paths=['lib/auth/session.ts'],f=>f.item.branch='main',f=>f.item.sha='bad',
    f=>f.item.roadmap_heading='## Invented heading',f=>f.item.dependencies=['missing']]) {
    const g=roadmapFixture();change(g);
    // Scope tests use an exact grant as well: an authorization still cannot
    // override protected paths, branch restrictions or unresolved dependencies.
    if(!g.grant.revoked && g.item.test_criteria[0]!=='changed scope')g.grant.criteria_sha=hash(g.item);
    assert.equal(readRoadmapDiscovery(g.ctx,g.s,g.read).candidate,null);
  }
});

test('roadmap admission detects live revocation and canonical CAS changes without modifying state',()=>{
  const f=roadmapFixture(),source=readRoadmapDiscovery(f.ctx,f.s,f.read);
  f.grant.revoked=true;
  const before=structuredClone(f.s);
  assert.throws(()=>admitRoadmapDiscovery(f.s,source),/ROADMAP_LIVE_AUTHORIZATION/);
  assert.deepEqual(f.s,before);
  assert.throws(()=>readRoadmapDiscovery(f.ctx,roadmapFixture().s,args=>
    args[0]==='rev-parse'?A:f.read(args)),/ROADMAP_CANONICAL_CHANGED/);
});


test('canonical rail takes first station even when unrelated historical READY task exists',()=>{
  const f=roadmapFixture();
  f.s.tasks.push(task({task_id:'other-ready',priority:0,inputs:{sha:A},
    authorized:true,pr_effect:'EXISTING_PR',target_pr:551}));
  f.s.roadmap_discovery.standing_build=standingMandate();
  f.s.roadmap_discovery.grants=[];
  f.checkpoint.roadmap_backlog.rail={version:1,mode:'SINGLE_TRACK',
    completion_policy:'MATERIAL_AND_PASS',station_ids:[f.item.task_id]};
  const got=readRoadmapDiscovery(f.ctx,f.s,f.read);
  assert.equal(got.reason,'AUTHORIZED_CANONICAL_RAIL_STATION');
  assert.equal(got.candidate.item.task_id,f.item.task_id);
  assert.deepEqual(got.rail,{station_id:f.item.task_id,index:0,total:1});
});

test('roadmap blocked dependency does not starve a different authorized existing PR',()=>{
  const f=roadmapFixture(),other={...f.item,task_id:'roadmap-independent',target_pr:550};
  f.item.dependencies=['blocked'];f.grant.criteria_sha=hash(f.item);
  f.checkpoint.roadmap_backlog.items.push(other);
  f.s.roadmap_discovery.grants.push({...f.grant,task_id:other.task_id,criteria_sha:hash(other)});
  f.s.tasks.push(make('WAIT_HUMAN',{task_id:'blocked'}));
  assert.equal(readRoadmapDiscovery(f.ctx,f.s,f.read).candidate.item.task_id,other.task_id);
});

const railFixture=f=>{
  f.checkpoint.roadmap_backlog.rail={version:1,mode:'SINGLE_TRACK',
    completion_policy:'MATERIAL_AND_PASS',station_ids:[f.item.task_id]};
  return f;
};
const standingMandate=()=>({enabled:true,source:'human-message',
  scope:'EXISTING_PR_LOW_RISK_BUILD',evidence_sha:hash('actual fixture human source'),
  no_new_prs:true,max_paths:3});

test('standing human mandate admits scoped READY build without fabricating per-task grant',()=>{
  const f=railFixture(roadmapFixture());f.s.roadmap_discovery.grants=[];
  f.s.roadmap_discovery.standing_build=standingMandate();
  assert.equal(standingBuildPolicy(f.s.roadmap_discovery),true);
  const source=readRoadmapDiscovery(f.ctx,f.s,f.read);
  assert.equal(source.reason,'AUTHORIZED_CANONICAL_RAIL_STATION');
  assert.equal(source.candidate.grant.mode,'STANDING_POLICY');
  const admitted=admitRoadmapDiscovery(f.s,source),t=admitted.tasks[0];
  assert.equal(t.discovery.authorization.source,undefined);
  assert.equal(t.discovery.authorization.mode,'STANDING_POLICY');
  assert.equal(roadmapAuthorized(admitted,t),true);
  assert.equal(readRoadmapDiscovery(f.ctx,admitted,f.read).candidate,null);
  const revoked=structuredClone(admitted);
  revoked.roadmap_discovery.standing_build.revoked=true;
  assert.equal(roadmapAuthorized(revoked,t),false);
  const changed=structuredClone(admitted);
  changed.roadmap_discovery.standing_build.evidence_sha=hash('different human policy');
  assert.equal(roadmapAuthorized(changed,t),false);
  const explicitlyRevoked=structuredClone(admitted);
  explicitlyRevoked.roadmap_discovery.grants.push({task_id:t.task_id,revoked:true});
  assert.equal(roadmapAuthorized(explicitlyRevoked,t),false);
  const invalid=railFixture(roadmapFixture());invalid.s.roadmap_discovery.grants=[];
  invalid.s.roadmap_discovery.standing_build=standingMandate();
  invalid.s.roadmap_discovery.standing_build.max_paths=4;
  assert.equal(readRoadmapDiscovery(invalid.ctx,invalid.s,invalid.read).candidate,null);
});

test('standing mandate cannot invent backlog, override blocked PR or modify sensitive paths',()=>{
  const f=railFixture(roadmapFixture());f.s.roadmap_discovery.grants=[];
  f.s.roadmap_discovery.standing_build=standingMandate();
  delete f.checkpoint.roadmap_backlog;
  assert.equal(readRoadmapDiscovery(f.ctx,f.s,f.read).reason,'ROADMAP_STRUCTURED_CRITERIA_REQUIRED');
  for(const change of [
    x=>x.item.paths=['lib/auth/session.ts'],
    x=>x.item.paths=['components/school/secret.ts'],
    x=>x.item.paths=['lib/a.ts','lib/b.ts','lib/c.ts','lib/d.ts'],
    x=>x.item.branch='main',
    x=>x.item.dependencies=['nonexistent'],
    x=>x.item.roadmap_heading='## Not an actual roadmap heading',
    x=>x.s.tasks.push(make('WAIT_HUMAN',{target_pr:554})),
    x=>{x.s.roadmap_discovery.standing_build.revoked=true;},
    x=>{x.s.roadmap_discovery.standing_build.no_new_prs=false;},
  ]){
    const v=railFixture(roadmapFixture());v.s.roadmap_discovery.grants=[];
    v.s.roadmap_discovery.standing_build=standingMandate();change(v);
    assert.equal(readRoadmapDiscovery(v.ctx,v.s,v.read).candidate,null);
  }
  // A user-agent-copied comment or generated document is not a human policy.
  const fake=railFixture(roadmapFixture());fake.s.roadmap_discovery.grants=[];
  fake.s.roadmap_discovery.standing_build={...standingMandate(),source:'github-comment'};
  assert.equal(readRoadmapDiscovery(fake.ctx,fake.s,fake.read).candidate,null);
});

test('standing authorization is checked again after discovery and on revoked push intent',()=>{
  const f=railFixture(roadmapFixture());f.s.roadmap_discovery.grants=[];
  f.s.roadmap_discovery.standing_build=standingMandate();
  const source=readRoadmapDiscovery(f.ctx,f.s,f.read);
  f.s.roadmap_discovery.standing_build.revoked=true;
  assert.throws(()=>admitRoadmapDiscovery(f.s,source),/ROADMAP_LIVE_AUTHORIZATION_REQUIRED/);
  const x=fixture(),r=railFixture(roadmapFixture());
  try {
    const base=x.git('rev-parse','HEAD');
    r.item.sha=base;r.s.roadmap_discovery.grants=[];
    r.s.roadmap_discovery.standing_build=standingMandate();
    fs.mkdirSync(path.join(x.repo,'docs'),{recursive:true});
    fs.writeFileSync(path.join(x.repo,'docs/comun-product-objective-and-roadmap.md'),'# Roadmap\n## Search labels\n');
    fs.writeFileSync(path.join(x.repo,'reports/current/comun-execution-checkpoint.json'),
      JSON.stringify({legacy:{keep:true},orchV2:r.s,roadmap_backlog:r.checkpoint.roadmap_backlog}));
    x.git('add','.');x.git('commit','-m','standing fixtures');x.git('update-ref',REF,'HEAD');
    const ctx=context(x.repo);
    const result=tick(ctx,{now:NOW,reconcile:false,worktreeRoot:path.join(x.repo,'cycles'),
      discover:()=>({repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),
        inventory:[],candidate:null,reason:'NO_SUPPORTED_REPAIR_EVIDENCE',scan_index:1}),
      resolveExecutionBase:()=>base});
    assert.equal(result.action,'EXECUTE');
    const loaded=loadState(ctx),revoked=structuredClone(loaded.state);
    revoked.roadmap_discovery.standing_build.revoked=true;
    saveState(ctx,revoked,loaded.expectedHash,result.owner_id);
    const previous=fs.readFileSync(ctx.ledger);
    assert.throws(()=>record(ctx,{owner_id:result.owner_id,task_id:r.item.task_id,
      event:{type:'operation-intent',operation_id:'revoked-standing',
        expected_sha:base,action:'normal-code-push'},now:NOW+1}),/ROADMAP_AUTHORIZATION_REVOKED/);
    assert.deepEqual(fs.readFileSync(ctx.ledger),previous);
    record(ctx,{owner_id:result.owner_id,task_id:r.item.task_id,event:{type:'cycle-complete'},now:NOW+1});
    x.git('worktree','remove',result.worktree);
  }finally{x.cleanup();}
});
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

test('rail claims its own station even with a higher-priority unrelated READY task',()=>{
  const f=fixture(),r=railFixture(roadmapFixture());let result;
  try {
    const base=f.git('rev-parse','HEAD');
    r.item.sha=base;r.s.roadmap_discovery.grants=[];
    r.s.roadmap_discovery.standing_build=standingMandate();
    r.s.tasks.push(task({task_id:'older-ready',priority:0,
      authorized:true,inputs:{sha:base},action:'local-code',
      pr_effect:'EXISTING_PR',target_pr:551}));
    fs.mkdirSync(path.join(f.repo,'docs'),{recursive:true});
    fs.writeFileSync(path.join(f.repo,'docs/comun-product-objective-and-roadmap.md'),
      '# Roadmap\n## Search labels\n');
    fs.writeFileSync(path.join(f.repo,'reports/current/comun-execution-checkpoint.json'),
      JSON.stringify({legacy:{keep:true},orchV2:r.s,roadmap_backlog:r.checkpoint.roadmap_backlog}));
    f.git('add','.');f.git('commit','-m','rail claim fixtures');f.git('update-ref',REF,'HEAD');
    const ctx=context(f.repo);
    result=tick(ctx,{now:NOW,reconcile:false,worktreeRoot:path.join(f.repo,'cycles'),
      resolveExecutionBase:()=>base});
    assert.equal(result.action,'EXECUTE');
    assert.equal(result.selected,r.item.task_id);
    const persisted=loadState(ctx).state;
    assert.equal(persisted.tasks.find(t=>t.task_id==='older-ready').authorized,true);
    assert.equal(persisted.tasks.find(t=>t.task_id==='older-ready').status,'READY');
    assert.equal(persisted.tasks.find(t=>t.task_id===r.item.task_id).status,'RUNNING');
    record(ctx,{owner_id:result.owner_id,task_id:result.selected,
      event:{type:'cycle-complete'},now:NOW+1});
    f.git('worktree','remove',result.worktree);
  } finally { f.cleanup(); }
});
test('locked runtime admits canonical roadmap criteria into one owned worktree after repair intake is empty',()=>{
  const f=fixture(),r=roadmapFixture();
  try {
    const base=f.git('rev-parse','HEAD');r.item.sha=base;r.grant.criteria_sha=hash(r.item);
    fs.mkdirSync(path.join(f.repo,'docs'),{recursive:true});
    fs.writeFileSync(path.join(f.repo,'docs/comun-product-objective-and-roadmap.md'),'# Roadmap\n## Search labels\n');
    fs.writeFileSync(path.join(f.repo,'reports/current/comun-execution-checkpoint.json'),
      JSON.stringify({legacy:{keep:true},orchV2:r.s,roadmap_backlog:{items:[r.item]}}));
    f.git('add','.');f.git('commit','-m','canonical authorized criteria');f.git('update-ref',REF,'HEAD');
    const ctx=context(f.repo);
    const result=tick(ctx,{now:NOW,worktreeRoot:path.join(f.repo,'cycles'),reconcile:false,
      discover:()=>({repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),
        inventory:[],candidate:null,reason:'NO_SUPPORTED_REPAIR_EVIDENCE',scan_index:1}),
      resolveExecutionBase:()=>base});
    assert.equal(result.action,'EXECUTE');assert.equal(result.task.task_id,r.item.task_id);
    assert.equal(result.roadmap_discovery.admitted,r.item.task_id);
    assert.equal(result.worktrees,1);assert.equal(loadState(ctx).state.tasks.length,1);
    assert.equal(result.task.lease.base_sha,base);
    const again=tick(ctx,{now:NOW+1,reconcile:false});
    assert.equal(again.reason,'HELD_LIVE');assert.equal(again.worktrees,0);
    const loaded=loadState(ctx),revoked=structuredClone(loaded.state);
    revoked.roadmap_discovery.enabled=false;
    saveState(ctx,revoked,loaded.expectedHash,result.owner_id);
    const beforeIntent=fs.readFileSync(ctx.ledger);
    assert.throws(()=>record(ctx,{owner_id:result.owner_id,task_id:r.item.task_id,
      event:{type:'operation-intent',operation_id:'must-not-push',
        expected_sha:base,action:'normal-code-push'},now:NOW+2}),/ROADMAP_AUTHORIZATION_REVOKED/);
    assert.deepEqual(fs.readFileSync(ctx.ledger),beforeIntent);
    record(ctx,{owner_id:result.owner_id,task_id:r.item.task_id,event:{type:'cycle-complete'},now:NOW+2});
    f.git('worktree','remove',result.worktree);
  }finally{f.cleanup();}
});
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
test('non-actionable failing workflow does not starve a scoped repair in the same HEAD',()=>{
  const p={number:551,state:'open',base:{ref:'main',repo:{full_name:REPOSITORY}},head:{sha:A,ref:'existing',repo:{full_name:REPOSITORY}}};
  const base={run_attempt:1,head_sha:A,event:'pull_request',repository:{full_name:REPOSITORY},status:'completed',conclusion:'failure'};
  const infra={...base,id:31,workflow_id:1,name:'COMUN Experience Coherence'};
  const format={...base,id:30,workflow_id:2,name:'COMUN Quality Performance Deliverability'};
  const job=(run_id,name)=>({id:run_id+100,run_id,head_sha:A,conclusion:'failure',steps:[{name,conclusion:'failure'}]});
  let jobReads=0,logReads=0;
  const read=route=>{
    if(route.includes('?state=open'))return [p];
    if(route.includes('/actions/runs?'))return {total_count:2,workflow_runs:[infra,format]};
    if(route.includes('/jobs?')){jobReads++;
      return route.includes('/31/jobs?')?{total_count:1,jobs:[job(31,'Reset disposable Supabase stack')]}:
        {total_count:1,jobs:[job(30,'Check formatted files')]};}
    return p;
  };
  const out=readDiscovery(state(),null,read,()=>{logReads++;return '[warn] tests/experience-coherence/games-entry.spec.ts\n[warn] Code style issues found';});
  assert.equal(out.candidate.run,30);assert.equal(out.candidate.recipe,'PRETTIER_TEST_ONLY');
  assert.equal(out.failed_workflow.run,30);assert.equal(jobReads,2);assert.equal(logReads,1);
  const extra=[infra,format,...[29,28,27].map((id,i)=>({...base,id,workflow_id:id,name:'Unrelated failure '+i}))];
  let bounded=0;
  const none=readDiscovery(state(),null,route=>{
    if(route.includes('/actions/runs?'))return {total_count:extra.length,workflow_runs:extra};
    if(route.includes('/jobs?')){bounded++;return {total_count:1,jobs:[job(31,'Supabase descartável — reset local')]};}
    return read(route);
  },()=>assert.fail('infra failures must not request logs'));
  assert.equal(none.candidate,null);assert.equal(bounded,4);
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
test('three empty wakes without a repair grant track non-delivery without mutations',()=>{
  const f=fixture();
  try {
    const checkpointPath=path.join(f.repo,'reports/current/comun-execution-checkpoint.json');
    const checkpoint=JSON.parse(fs.readFileSync(checkpointPath,'utf8'));
    checkpoint.orchV2=state([]);
    delete checkpoint.orchV2.queue_discovery;
    fs.writeFileSync(checkpointPath,JSON.stringify(checkpoint));
    f.git('add','reports/current/comun-execution-checkpoint.json');
    f.git('commit','-m','fixture without repair grant');
    f.git('update-ref',REF,'HEAD');
    const ctx=context(f.repo);
    const first=tick(ctx,{now:NOW,reconcile:false});
    assert.equal(first.action,'NOOP');
    assert.equal(first.progress.cycles_since_delivery,1);
    assert.equal(first.observer_control.delivery_monitor.cycles_since_delivery,1);
    const originalLedger=fs.readFileSync(ctx.ledger);
    const second=tick(ctx,{now:NOW+40*60000,reconcile:false,
      observer_control:first.observer_control});
    assert.equal(second.action,'NOOP');
    assert.equal(second.progress.cycles_since_delivery,2);
    assert.equal(second.writes,0);assert.equal(second.worktrees,0);
    assert.equal(second.notify,false);
    const third=tick(ctx,{now:NOW+80*60000,reconcile:false,
      observer_control:second.observer_control});
    assert.equal(third.action,'NOOP');
    assert.equal(third.progress.cycles_since_delivery,3);
    assert.equal(third.writes,0);assert.equal(third.worktrees,0);
    assert.equal(third.notify,false);
    assert.deepEqual(fs.readFileSync(ctx.ledger),originalLedger);
    assert.equal(inspectLock(ctx.common).state,'FREE');
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


test('due intake arbitration never starves repair behind repetitive merge scans',()=>{
  const s=docsState(), base={version:1,cursors:{}};
  // First wake favors integration; its next scheduled window then releases the repair lane.
  assert.equal(chooseDiscoveryLane(s,NOW,base,1),'merge');
  const afterMerge={version:1,cursors:{
    [MERGE_DISCOVERY_ID]:{next_probe_at:new Date(NOW+40*60000).toISOString()},
  }};
  assert.equal(chooseDiscoveryLane(s,NOW,afterMerge,1),'repair');
  const dueBoth={version:1,cursors:{
    [MERGE_DISCOVERY_ID]:{next_probe_at:new Date(NOW-60000).toISOString()},
    'queue-discovery':{next_probe_at:new Date(NOW-120000).toISOString()},
  }};
  assert.equal(chooseDiscoveryLane(s,NOW,dueBoth,1),'repair');
  dueBoth.cursors['queue-discovery'].next_probe_at=new Date(NOW-30000).toISOString();
  assert.equal(chooseDiscoveryLane(s,NOW,dueBoth,1),'merge');
  assert.equal(chooseDiscoveryLane(s,NOW,dueBoth,0),null);
  const unpermitted={...s}; delete unpermitted.queue_discovery;
  delete unpermitted.merge_policy;
  assert.equal(chooseDiscoveryLane(unpermitted,NOW,base,1),null);
});


test('bounded TypeScript repairs require own failed step, safe compiler location and same PR head',()=>{
  const p={number:551,state:'open',base:{ref:'main',repo:{full_name:REPOSITORY}},
    head:{sha:A,ref:'existing',repo:{full_name:REPOSITORY}}};
  const run={id:22,workflow_id:1,name:'COMUN Quality Performance Deliverability',
    run_attempt:1,head_sha:A,event:'pull_request',repository:{full_name:REPOSITORY},
    status:'completed',conclusion:'failure'};
  const job={id:33,run_id:22,head_sha:A,conclusion:'failure',
    steps:[{name:'Typecheck',conclusion:'failure'}]};
  const read=route=>route.includes('?state=open')?[p]:
    route.includes('/actions/runs?')?{total_count:1,workflow_runs:[run]}:
    route.includes('/jobs?')?{total_count:1,jobs:[job]}:p;
  const good=readDiscovery(state(),null,read,()=>
    'components/comun-card.tsx(17,9): error TS2322: Type mismatch');
  assert.equal(good.candidate.recipe,'TSC_SCOPED_FIX');
  assert.deepEqual(good.candidate.paths,['components/comun-card.tsx']);
  const admitted=admitDiscovery(state(),good,NOW);
  assert.equal(admitted.tasks[0].status,'READY');
  assert.equal(admitted.tasks[0].execution_base,'PR_HEAD');
  assert.equal(admitted.tasks[0].discovery.recipe,'TSC_SCOPED_FIX');
  assert.equal(readDiscovery(state(),null,read,()=>
    'lib/comun-auth.ts(17,9): error TS2322: unsafe').candidate,null);
  assert.equal(readDiscovery(state(),null,read,()=>
    'app/api/route.ts(17,9): error TS2322: unsafe').candidate,null);
  assert.equal(readDiscovery(state(),null,read,()=>
    'The instruction is to edit components/comun-card.tsx').candidate,null);
  const unrelated=route=>route.includes('/jobs?')?
    {total_count:1,jobs:[{...job,steps:[{name:'Build',conclusion:'failure'}]}]}:read(route);
  assert.equal(readDiscovery(state(),null,unrelated,()=>
    'components/comun-card.tsx(17,9): error TS2322: Type mismatch').candidate,null);
});
