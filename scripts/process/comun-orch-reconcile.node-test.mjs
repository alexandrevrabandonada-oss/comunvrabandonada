import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {task,hash,plan} from './comun-orch-v2.mjs';
import {context,tick,loadState,record,REF,REMOTE,acquireLock,releaseLock,saveState} from './comun-orch-runtime.mjs';
import {REPOSITORY,DELAYS,readTracked,applyObservation,watchSpec,nextObservation,reconcileOne,inventory} from './comun-orch-reconcile.mjs';
import {MODULES,consolidateRuntime,stageRelease,canary,rollbackRuntime} from './comun-orch-release.mjs';
import {readControl,controlBlock} from './comun-orch-memory.mjs';
const A='a'.repeat(40),B='b'.repeat(40),NOW=Date.parse('2026-10-17T03:00:00Z');
const review=()=>task({task_id:'review-pr511-stack',priority:3,status:'WAIT_EXTERNAL',
  inputs:{sha:A,contract:'Review exact existing stack; no merge'},action:'read-only',pr_effect:'EXISTING_PR',target_pr:511});
const workflow=()=>task({task_id:'pr556-quality',priority:1,status:'WAIT_EXTERNAL',
  inputs:{sha:A,run:1,contract:'COMUN Quality Performance Deliverability: aggregate workflow conclusion on exact head only'},
  action:'read-only',pr_effect:'EXISTING_PR',target_pr:556,probe:{kind:'github-run',pr:556,run:1},attempts_for_fingerprint:2});
const state=tasks=>({schema_version:2,revision:0,tasks,integration_debt:{no_new_prs:true}});
const source=(t,sha=B)=>({repository:REPOSITORY,kind:watchSpec(t).kind,pr:t.target_pr,sha,branch:'existing'});
const runSource=(t,more={})=>({...source(t),run:{id:2,name:'COMUN Quality Performance Deliverability',head_sha:B,event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,...more}});
function fixture(tasks){
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'comun-reconcile-'));
  const git=(...a)=>execFileSync('git',['-C',repo,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('config','user.name','Observer fixture');git('config','user.email','fixture@example.invalid');git('config','core.autocrlf','false');git('remote','add','origin',REMOTE);
  fs.mkdirSync(path.join(repo,'reports/current'),{recursive:true});
  fs.writeFileSync(path.join(repo,'reports/current/comun-execution-checkpoint.json'),JSON.stringify({legacy:{authorization:false,keep:['V1']},orchV2:state(tasks)}));
  git('add','.');git('commit','-m','fixture');git('update-ref',REF,'HEAD');
  return {repo,git,ctx:context(repo),cleanup(){assert(path.resolve(repo).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(repo,{recursive:true});}};
}

test('old WAIT_EXTERNAL without a probe is observable; changed tracked head reactivates independent review',()=>{
  const t=review(),s=state([task({task_id:'school',priority:0,status:'BLOCKED_PROTECTED',inputs:{sha:A},action:'migration'}),t]);
  assert.equal(nextObservation(s,NOW).task_id,t.task_id);
  const next=applyObservation(s,t.task_id,source(t),NOW);
  assert.equal(next.tasks[0].status,'BLOCKED_PROTECTED');assert.equal(next.tasks[1].status,'READY');
  assert.equal(next.tasks[1].inputs.sha,B);assert.equal(plan(next,{now:NOW}).selected,t.task_id);
  assert.equal(next.integration_debt.no_new_prs,true);
  assert.equal(applyObservation(next,t.task_id,source(t),NOW+1),next);
});

test('new workflow source resets only pertinent retries, with exact-head scope and retained historical proof',()=>{
  const t=workflow();t.evidence=[{sha:A,result:'PASS',scope:'historical',input_fingerprint:t.input_fingerprint}];
  const next=applyObservation(state([t]),t.task_id,runSource(t),NOW),n=next.tasks[0];
  assert.equal(n.status,'DONE');assert.equal(n.evidence_sha,B);assert.equal(n.evidence.length,2);
  assert.equal(n.evidence[0].sha,A);assert.equal(n.evidence[1].sha,B);assert.match(n.evidence[1].scope,/aggregate.*not all-head/);
  assert.equal(n.attempts_for_fingerprint,0);assert.equal(applyObservation(next,t.task_id,runSource(t),NOW+1),next);
  assert.throws(()=>applyObservation(state([t]),t.task_id,runSource(t,{head_sha:A}),NOW),/RUN_REQUIRED/);
  assert.throws(()=>applyObservation(state([t]),t.task_id,runSource(t,{event:'workflow_dispatch'}),NOW),/RUN_REQUIRED/);
  const skipped=applyObservation(state([t]),t.task_id,runSource(t,{conclusion:'skipped'}),NOW);
  assert.notEqual(skipped.tasks[0].status,'DONE');
  const historical=workflow();historical.inputs.sha=B;historical.inputs.run=2;historical.input_fingerprint=hash(historical.inputs);
  const stalled=state([historical]);
  assert.equal(applyObservation(stalled,historical.task_id,runSource(historical,{conclusion:'failure'}),NOW),stalled);
});

test('closed registry excludes protected tasks, uncertain effects, unknown PRs and exact Preview contract',()=>{
  for(const more of [{status:'WAIT_HUMAN'},{status:'BLOCKED_PROTECTED'},{action:'merge'},
    {operations:[{state:'UNCERTAIN'}]},{authorized:false},{proof_contract:'COST_AND_EXACT_PREVIEW_V1'},
    {target_pr:555},{task_id:'untracked'}])assert.equal(watchSpec({...workflow(),...more}),null);
  const inv=inventory(state([task({task_id:'pr552-cost-publication',priority:6,status:'WAIT_EXTERNAL',inputs:{sha:A}})]));
  assert.match(inv[0].unblocking_evidence,/exact Git Preview/);assert.equal(inv[0].observer,null);
});

test('bounded read validates repository, exact workflow and moving head; no remote mutation routes',()=>{
  const t=workflow(),routes=[],pr={number:556,state:'open',base:{repo:{full_name:REPOSITORY}},head:{sha:B,ref:'existing',repo:{full_name:REPOSITORY}}};
  const r={...runSource(t).run,repository:{full_name:REPOSITORY}};
  const read=route=>{routes.push(route);return route.includes('/actions/')?{total_count:1,workflow_runs:[r]}:pr;};
  assert.deepEqual(readTracked(t,read),runSource(t));assert.equal(routes.length,3);
  assert(routes.every(r=>r.startsWith(`repos/${REPOSITORY}/`)));
  assert.throws(()=>readTracked(t,r=>r.includes('/actions/')?{total_count:101,workflow_runs:[]}:pr),/INCOMPLETE/);
  assert.throws(()=>readTracked(t,r=>({...pr,base:{repo:{full_name:'other/repo'}}})),/SCOPE/);
  let n=0;assert.throws(()=>readTracked(t,route=>route.includes('/actions/')?{total_count:1,workflow_runs:[r]}:(++n===1?pr:{...pr,head:{...pr.head,sha:A}})),/HEAD_MOVED/);
});

test('cursor backs off unchanged input; two equal API errors suspend with one alert and no third call',()=>{
  let s=state([review()]),now=NOW,control;
  for(const delay of DELAYS){const t=s.tasks[0],r=reconcileOne(s,t,now,()=>source(t,A),control);
    assert.equal(r.material,false);assert.deepEqual(r.state.tasks,s.tasks);
    assert.equal(r.state,s);assert.equal(Date.parse(r.observation.next_probe_at)-now,delay);control=r.observer_control;s=r.state;now=Date.parse(r.observation.next_probe_at);}
  let calls=0,alerts=0;s=state([review()]);now=NOW;control=undefined;
  for(let i=0;i<2;i++){
    const t=nextObservation(s,now,control);const r=reconcileOne(s,t,now,()=>{calls++;throw Error('HTTP 502 transient provider');},control);
    alerts+=r.notifications.length;control=r.observer_control;s=r.state;now=Date.parse(r.observation.next_probe_at) || now+86400000;
  }
  assert.equal(calls,2);assert.equal(alerts,1);assert.equal(nextObservation(s,NOW+365*86400000,control),null);
  s.tasks[0].inputs={sha:B,contract:'new verified input'};s.tasks[0].input_fingerprint=hash(s.tasks[0].inputs);
  assert.equal(nextObservation(s,NOW+365*86400000,control)?.task_id,'review-pr511-stack');
});

test('dependent certificate never combines heads; blocked dependency does not block independent review',()=>{
  const dep=workflow();dep.inputs.sha=B;dep.input_fingerprint=hash(dep.inputs);dep.status='DONE';dep.evidence_sha=B;
  dep.evidence=[{sha:B,input_fingerprint:dep.input_fingerprint,result:'PASS'}];
  const cert=task({task_id:'cert',priority:0,inputs:{sha:A},pr_effect:'EXISTING_PR',target_pr:556,dependencies:[dep.task_id]});
  const independent={...review(),status:'READY'};
  assert.equal(plan(state([dep,cert,independent]),{now:NOW}).selected,independent.task_id);
});

test('platform memory cursor survives separate wakes without any runtime write or proof authorization',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comun-memory-')),file=path.join(dir,'memory.md');
  try {
    const s=state([review()]),r=reconcileOne(s,s.tasks[0],NOW,t=>source(t,A));
    assert.equal(r.state,s);assert.equal(readControl(file),undefined);
    fs.writeFileSync(file,'Short required run summary\n'+controlBlock(r.observer_control));
    const bytes=fs.readFileSync(file),mtime=fs.statSync(file).mtimeMs,control=readControl(file);
    assert.equal(nextObservation(s,NOW+1,control),null);assert.equal(nextObservation(s,NOW+16*60000,control)?.task_id,'review-pr511-stack');
    assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(fs.statSync(file).mtimeMs,mtime);
    fs.writeFileSync(file,'<!-- ORCH_OBSERVER_CONTROL\ninvalid\nORCH_OBSERVER_CONTROL -->');
    assert.throws(()=>readControl(file),/MEMORY_INVALID/);
  }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true});}
});

test('real ledger: one observation, two zero-write NOOPs, rejected CAS and concurrent lock preserve bytes',()=>{
  const t=review(),f=fixture([t]);let calls=0;
  try {
    let p=tick(f.ctx,{now:NOW,observeExternal:t=>{calls++;return source(t,A);}});
    assert.equal(p.action,'OBSERVE');assert.equal(p.materialChanges.length,0);assert.equal(p.worktrees,0);
    const observer_control=p.observer_control;
    const bytes=fs.readFileSync(f.ctx.ledger),mtime=fs.statSync(f.ctx.ledger).mtimeMs;
    for(let i=0;i<2;i++){p=tick(f.ctx,{now:NOW+i+1,observer_control,observeExternal:()=>{throw Error('must not read');}});assert.equal(p.action,'NOOP');assert.equal(p.writes,0);}
    assert.equal(calls,1);assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert.equal(fs.statSync(f.ctx.ledger).mtimeMs,mtime);
    assert(acquireLock(f.ctx.common,'contender'));
    assert.equal(tick(f.ctx,{now:NOW+86400000}).reason,'HELD_LIVE');assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
    assert.throws(()=>saveState(f.ctx,loadState(f.ctx).state,'stale-hash','contender'),/CAS/);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert(releaseLock(f.ctx.common,'contender'));
    p=tick(f.ctx,{now:NOW+16*60000,worktreeRoot:path.join(f.ctx.common,'cycles'),observeExternal:t=>source(t)});
    assert.equal(p.action,'EXECUTE');assert.equal(p.selected,t.task_id);assert.equal(p.materialChanges.length,1);
    const current=loadState(f.ctx).state.tasks[0];
    record(f.ctx,{owner_id:p.owner_id,task_id:t.task_id,event:{type:'result',sha:B,input_fingerprint:current.input_fingerprint,result:'PASS',scope:'Fixture review only',evidence_sha:hash('fixture review')}});
    assert.equal(loadState(f.ctx).state.tasks[0].status,'DONE');f.git('worktree','remove',p.worktree);
  }finally{releaseLock(f.ctx.common,'contender');f.cleanup();}
});

test('installed launcher reverses a rejected canary, then observes real Git fixture and advances independent work',()=>{
  const f=fixture([review(),task({task_id:'school',priority:0,status:'BLOCKED_PROTECTED',inputs:{sha:A},action:'migration'})]);
  try {
    const install=path.join(f.ctx.common,'installed');fs.mkdirSync(install);
    const names=MODULES;
    const files={};fs.mkdirSync(path.join(f.repo,'scripts/process'),{recursive:true});
    for(const name of names){const b=fs.readFileSync(fileURLToPath(new URL(name,import.meta.url)));files[name]=hash(b.toString());fs.writeFileSync(path.join(install,name),b);fs.writeFileSync(path.join(f.repo,'scripts/process',name),b);}
    f.git('add','scripts');f.git('commit','-m','candidate installation');f.git('update-ref',REF,'HEAD',f.ctx.canonical);
    const manifest=JSON.stringify({common:f.ctx.common,files});fs.writeFileSync(path.join(install,'manifest.json'),manifest);
    const call=(...args)=>spawnSync(process.execPath,[path.join(install,'comun-orch-launcher.mjs'),...args,'--repo',f.repo],{encoding:'utf8'});
    assert.equal(JSON.parse(call('diagnose').stdout).observation_due,'review-pr511-stack');assert(!fs.existsSync(f.ctx.ledger));
    fs.writeFileSync(path.join(install,'manifest.json'),JSON.stringify({common:'wrong',files}));
    assert.equal(JSON.parse(call('tick','--hold').stdout).action,'PROTECTED_STOP');assert(!fs.existsSync(f.ctx.ledger));
    fs.writeFileSync(path.join(install,'manifest.json'),manifest);
    assert.equal(JSON.parse(call('tick','--hold').stdout).reason,'REVERSIBLE_CANARY_HOLD');
    // Runtime below uses the exact copied installed source and real Git/locks/CAS,
    // with the external provider injected. No network mutation occurs in tests.
    const code=`import {context,tick} from ${JSON.stringify(new URL('file:///'+path.join(install,'comun-orch-runtime.mjs').replaceAll('\\','/')).href)};console.log(JSON.stringify(tick(context(${JSON.stringify(f.repo)}),{worktreeRoot:${JSON.stringify(path.join(f.ctx.common,'cycles'))},observeExternal:t=>(${JSON.stringify(source(review()))})})));`;
    const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
    const p=JSON.parse(r.stdout);assert.equal(p.action,'EXECUTE');assert.equal(p.selected,'review-pr511-stack');
    assert.equal(JSON.parse(call('diagnose').stdout).counts.RUNNING,1);
    const current=loadState(context(f.repo)).state.tasks.find(t=>t.task_id===p.selected);
    const eventFile=path.join(f.ctx.common,'result.json');fs.writeFileSync(eventFile,JSON.stringify({owner_id:p.owner_id,task_id:p.selected,event:{type:'result',sha:B,input_fingerprint:current.input_fingerprint,result:'PASS',scope:'Installed fixture review only',evidence_sha:hash('fixture')}}));
    assert.equal(call('record','--event',eventFile).status,0);assert(!fs.existsSync(path.join(f.ctx.common,'comun-roadmap-cycle.lock')));
    f.git('worktree','remove',p.worktree);
  }finally{f.cleanup();}
});

test('actual failed activation rolls back launcher by descendant CAS, preserving V1, ledger and original checkout',()=>{
  const f=fixture([task({task_id:'human',priority:0,status:'WAIT_HUMAN',inputs:{sha:A}})]);
  try {
    fs.mkdirSync(path.join(f.repo,'scripts/process'),{recursive:true});
    for(const name of MODULES)fs.copyFileSync(fileURLToPath(new URL(name,import.meta.url)),path.join(f.repo,'scripts/process',name));
    f.git('add','scripts');f.git('commit','-m','previous verified release');f.git('update-ref',REF,'HEAD',f.ctx.canonical);
    const oldCtx=context(f.repo),oldHead=f.git('rev-parse','HEAD'),oldDir=path.join(f.ctx.common,'old-release');
    stageRelease(oldCtx,f.repo,oldHead,oldDir);assert(canary(f.repo,oldDir).verified);
    tick(oldCtx);const ledger=fs.readFileSync(f.ctx.ledger),checkpoint=f.git('show',`${REF}:reports/current/comun-execution-checkpoint.json`);
    fs.appendFileSync(path.join(f.repo,'scripts/process/comun-orch-launcher.mjs'),'\n// release rollback fixture\n');
    f.git('add','scripts');f.git('commit','-m','new release candidate');const candidate=f.git('rev-parse','HEAD');
    assert(acquireLock(f.ctx.common,'activation'));
    const release=consolidateRuntime(oldCtx,'activation',f.repo,candidate);
    const dir=path.join(f.ctx.common,'new-release');stageRelease(context(f.repo),f.repo,candidate,dir);
    assert(canary(f.repo,dir).verified);
    const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));manifest.common='incorrect';
    fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest));
    assert.throws(()=>canary(f.repo,dir),/CANARY_FAILED/);
    const restored=rollbackRuntime(context(f.repo),'activation',release);
    f.git('merge-base','--is-ancestor',release.canonical,restored.canonical);
    assert.equal(f.git('show',`${REF}:reports/current/comun-execution-checkpoint.json`),checkpoint);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),ledger);assert.equal(f.git('rev-parse','HEAD'),candidate);assert.equal(f.git('status','--porcelain'),'');
    assert(canary(f.repo,oldDir).verified);assert(releaseLock(f.ctx.common,'activation'));
  }finally{releaseLock(f.ctx.common,'activation');f.cleanup();}
});
