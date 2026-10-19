import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {task,hash,transition,plan} from './comun-orch-v2.mjs';
import {context,tick,loadState,record,observe,acquireLock,releaseLock,atomicJson,saveState,integrate556,
  recover,inspectLock,REMOTE,REF} from './comun-orch-runtime.mjs';
import {previewProof} from './comun-orch-adapter.mjs';
const runtime=new URL('./comun-orch-runtime.mjs',import.meta.url).href;
const make=(id='a',more={})=>task({task_id:id,priority:1,inputs:{sha:'a'.repeat(40),contract:'local'},...more});
const state=tasks=>({schema_version:2,revision:0,tasks});
function fixture(tasks) {
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'comun-integration-'));
  const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('config','user.name','Integration fixture');git('config','user.email','fixture@example.invalid');
  git('remote','add','origin',REMOTE);fs.mkdirSync(path.join(repo,'reports/current'),{recursive:true});
  const checkpoint={legacy:{authorization:false,evidence:['do-not-change']},orchV2:state(tasks)};
  fs.writeFileSync(path.join(repo,'reports/current/comun-execution-checkpoint.json'),JSON.stringify(checkpoint));
  git('add','.');git('commit','-m','fixture');git('update-ref',REF,'HEAD');
  const ctx=context(repo);
  return {repo,ctx,git,cleanup(){assert(path.resolve(repo).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(repo,{recursive:true});}};
}
function child(code) {
  const p=spawn(process.execPath,['--input-type=module','-e',code],{stdio:['pipe','pipe','pipe']});
  let stdout='',stderr='';p.stdout.on('data',x=>stdout+=x);p.stderr.on('data',x=>stderr+=x);
  const done=new Promise((resolve,reject)=>{p.on('error',reject);p.on('exit',(code,signal)=>resolve({code,signal,stdout,stderr}));});
  return {p,done,ready:()=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(`child readiness timeout: ${stderr}`)),10000);p.stdout.once('data',chunk=>{clearTimeout(timer);resolve(chunk);});})};
}
test('real simultaneous child contenders: exactly one owner, loser never writes',async()=>{
  const f=fixture([make('human',{status:'WAIT_HUMAN'})]);
  const code=`import {acquireLock,releaseLock} from ${JSON.stringify(runtime)};const id=String(process.pid);const o=acquireLock(${JSON.stringify(f.ctx.common)},id);console.log(JSON.stringify({owned:!!o,id}));if(o){process.stdin.resume();process.stdin.once('data',()=>{releaseLock(${JSON.stringify(f.ctx.common)},id);process.exit(0);});}`;
  const a=child(code),b=child(code);
  try {
    const [first,second] = await Promise.all([a.ready(),b.ready()]);
    const ready = [first,second].map(x=>JSON.parse(x.toString()));
    assert.equal(ready.filter(x=>x.owned).length,1,'exactly one process must acquire the lock');
    // The losing process has already exited: writing to its stdin causes EPIPE
    // and masks the actual ownership assertion on fast CI runners.
    const winner = ready[0].owned ? a : b;
    winner.p.stdin.write('release');
    const results=await Promise.all([a.done,b.done]);
    assert(results.every(x=>x.code===0),JSON.stringify(results));
    assert.equal(results.filter(x=>JSON.parse(x.stdout).owned).length,1);
    assert.equal(inspectLock(f.ctx.common).state,'FREE');assert(!fs.existsSync(f.ctx.ledger));
  } finally {a.p.kill();b.p.kill();f.cleanup();}
});
test('kill between fsync and ledger rename preserves committed bytes; stale owner denied',async()=>{
  const f=fixture([make()]);
  try {atomicJson(f.ctx.ledger,{old:'preserved'});const before=fs.readFileSync(f.ctx.ledger);
    const code=`import {atomicJson} from ${JSON.stringify(runtime)};atomicJson(${JSON.stringify(f.ctx.ledger)},{next:true},${JSON.stringify(hash(before.toString()))},()=>{process.exit(77)});`;
    const result=await child(code).done;assert.equal(result.code,77);assert.deepEqual(fs.readFileSync(f.ctx.ledger),before);
    assert.throws(()=>saveState(f.ctx,state([make()]),hash(before.toString()),'foreign'),/ENOENT|OWNER/);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),before);
  }finally{f.cleanup();}
});
test('CAS is rechecked after staging, prevents stale overwrite',()=>{
  const f=fixture([make()]);try{atomicJson(f.ctx.ledger,{one:1});const expected=hash(fs.readFileSync(f.ctx.ledger,'utf8'));
    assert.throws(()=>atomicJson(f.ctx.ledger,{loser:1},expected,()=>fs.writeFileSync(f.ctx.ledger,'{"winner":true}')),/CAS/);
    assert.equal(fs.readFileSync(f.ctx.ledger,'utf8'),'{"winner":true}');
  }finally{f.cleanup();}
});
test('two actual no-work ticks do not even create transient locks or change directory mtimes',()=>{
  const f=fixture([make('human',{status:'WAIT_HUMAN'})]);try{
    tick(f.ctx);const bytes=fs.readFileSync(f.ctx.ledger),mtime=fs.statSync(f.ctx.ledger).mtimeMs;
    const commonMtime=fs.statSync(f.ctx.common).mtimeMs,wt=f.git('worktree','list','--porcelain'),ref=f.git('rev-parse',REF);
    for(let i=0;i<2;i++){const p=tick(f.ctx);assert.equal(p.action,'NOOP');assert.equal(p.writes,0);assert.equal(p.notify,false);assert.equal(p.worktrees,0);}
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert.equal(fs.statSync(f.ctx.ledger).mtimeMs,mtime);
    assert.equal(fs.statSync(f.ctx.common).mtimeMs,commonMtime);assert.equal(f.git('worktree','list','--porcelain'),wt);assert.equal(f.git('rev-parse',REF),ref);
  }finally{f.cleanup();}
});
test('real no-progress leases suspend on cycle two and allow independent priority',()=>{
  const f=fixture([make()]);const worktrees=[];try{
    for(let i=0;i<2;i++){const p=tick(f.ctx,{worktreeRoot:path.join(f.repo,'cycles')});worktrees.push(p.worktree);
      assert.equal(p.action,'EXECUTE');record(f.ctx,{owner_id:p.owner_id,task_id:'a',event:{type:'cycle-complete'}});
      assert.equal(inspectLock(f.ctx.common).state,'FREE');}
    const s=loadState(f.ctx).state;assert.equal(s.tasks[0].status,'WAIT_EXTERNAL');assert.equal(s.tasks[0].no_progress_cycles,2);
    assert.equal(tick(f.ctx).action,'NOOP');assert.equal(plan({...s,tasks:[...s.tasks,make('independent',{priority:9})]},{now:Date.now()}).selected,'independent');
  }finally{for(const wt of worktrees)if(wt)f.git('worktree','remove',wt);f.cleanup();}
});
test('real pending probes use 15min then 1h/4h/12h/24h, no extra network between windows',()=>{
  const now=Date.now();const f=fixture([make('ci',{status:'WAIT_CI',probe:{kind:'github-run'},next_probe_at:new Date(now).toISOString()})]);let calls=0,at=now;
  try{const probe=t=>{calls++;return {result:'PENDING',sha:t.inputs.sha,input_fingerprint:t.input_fingerprint};};
    for(const mins of [15,60,240,720,1440,1440]){tick(f.ctx,{now:at,probe});const t=loadState(f.ctx).state.tasks[0];
      assert.equal(Date.parse(t.next_probe_at)-at,mins*60000);tick(f.ctx,{now:at+1,probe});at=Date.parse(t.next_probe_at);}
    assert.equal(calls,6);
  }finally{f.cleanup();}
});
test('two read failures suspend probes permanently until pertinent input change',()=>{
  const now=Date.now(),f=fixture([make('ci',{status:'WAIT_CI',probe:{kind:'github-run'},next_probe_at:new Date(now).toISOString()})]);let calls=0;
  try{const probe=()=>{calls++;throw Error('network');};tick(f.ctx,{now,probe});tick(f.ctx,{now:now+41*60000,probe});tick(f.ctx,{now:now+7*86400000,probe});
    assert.equal(calls,2);assert.equal(loadState(f.ctx).state.tasks[0].next_probe_at,null);
  }finally{f.cleanup();}
});
test('crash after external effect: preserve intent, recover with complete session proof, reconcile without duplicate effect',async()=>{
  const f=fixture([make()]);const dir=path.join(f.ctx.common,'comun-roadmap-cycle.lock');
  try{
    const code=`import fs from 'node:fs';import {acquireLock,atomicJson} from ${JSON.stringify(runtime)};
      const o=acquireLock(${JSON.stringify(f.ctx.common)},'interrupted');o.processSession='fixture-ended-session';fs.writeFileSync(${JSON.stringify(path.join(dir,'owner.json'))},JSON.stringify(o));
      atomicJson(${JSON.stringify(f.ctx.ledger)},${JSON.stringify({remote:REMOTE,common:f.ctx.common,canonical:f.ctx.canonical,state:state([make('a',{status:'RUNNING',owner_id:'interrupted',operations:[{operation_id:'push-once',action:'normal-code-push',expected_sha:'a'.repeat(40),state:'UNCERTAIN'}]})])})});
      fs.writeFileSync(${JSON.stringify(path.join(f.repo,'effect-count'))},'1');process.exit(78);`;
    const result=await child(code).done;assert.equal(result.code,78,result.stderr);
    const raw=fs.readFileSync(path.join(dir,'owner.json'),'utf8'),o=JSON.parse(raw);
    assert.equal(tick(f.ctx).reason,'ORPHAN_UNKNOWN');
    assert.throws(()=>recover(f.ctx,{owner_id:'resume',lock_sha:'wrong',session_file:path.join(f.repo,'missing')}));
    const proof={source:'verified-session-record',session:o.processSession,owner_id:o.id,pid:o.pid,processStart:o.processStart,host:o.machine,status:'ENDED',noConcurrentGit:true,evidence_sha:hash(result)};
    const sessionFile=path.join(f.repo,'ended-session.json');fs.writeFileSync(sessionFile,JSON.stringify(proof));
    const r=recover(f.ctx,{owner_id:'resume',lock_sha:hash(raw),ledger_sha:loadState(f.ctx).expectedHash,session_file:sessionFile,session_sha:hash(JSON.stringify(proof))});
    assert.equal(r.action,'RECONCILE');assert.equal(fs.readFileSync(path.join(r.archive,'owner.json'),'utf8'),raw);
    record(f.ctx,{owner_id:'resume',task_id:'a',event:{type:'reconcile-operation',operation_id:'push-once',expected_sha:'a'.repeat(40),result:'APPLIED',evidence_sha:hash('authoritative readback')}});
    const t=loadState(f.ctx).state.tasks[0];record(f.ctx,{owner_id:'resume',task_id:'a',event:{type:'result',sha:t.inputs.sha,input_fingerprint:t.input_fingerprint,result:'PASS',scope:'fixture remote outcome only',evidence_sha:hash('fixture')}});
    assert.equal(fs.readFileSync(path.join(f.repo,'effect-count'),'utf8'),'1');assert.equal(inspectLock(f.ctx.common).state,'FREE');
  }finally{releaseLock(f.ctx.common,'resume');f.cleanup();}
});
test('canonical descendant and checkpoint cannot rewind operational own-SHA proof',()=>{
  const f=fixture([make('human',{status:'WAIT_HUMAN'})]);try{tick(f.ctx);const before=loadState(f.ctx).state;
    fs.writeFileSync(path.join(f.repo,'docs.txt'),'checkpoint-only');f.git('add','.');f.git('commit','-m','descendant');f.git('update-ref',REF,'HEAD',f.ctx.canonical);
    assert.deepEqual(loadState(context(f.repo)).state,before);
  }finally{f.cleanup();}
});
test('Preview rejects expired/cross-head/project/branch/target/runtime evidence; intentional ignore is distinct',()=>{
  const now=Date.now(),head='a'.repeat(40),ancestor='b'.repeat(40);
  const dep={id:'dpl_exact',sha:head,projectId:'p',branch:'b',environment:'preview',source:'git',state:'READY',verifiedAt:new Date(now).toISOString()};
  const input={headSha:head,projectId:'p',branch:'b',cost02:'SUCCESS',exact:dep};
  assert.equal(previewProof(input,now).status,'DEPLOY_READY_EXACT');
  for(const bad of [{verifiedAt:new Date(now-25*3600000).toISOString()},{sha:ancestor},{projectId:'other'},{branch:'other'},{environment:'production'},{state:'CANCELED',ignoreReason:'build-error'}])assert.notEqual(previewProof({...input,exact:{...dep,...bad}},now).status,'DEPLOY_READY_EXACT');
  const ignored={...input,exact:{...dep,state:'CANCELED',ignoreReason:'no-runtime-allowlist'},ancestor:{...dep,sha:ancestor},diff:{ancestorSha:ancestor,headSha:head,isAncestor:true,complete:true,files:['docs/a.md']}};
  const p=previewProof(ignored,now);assert.equal(p.status,'EQUIVALENT_RUNTIME_PREVIEW_PROVEN');assert.equal(p.satisfied,false);
  assert.equal(previewProof({...ignored,diff:{...ignored.diff,files:['scripts/ci/build.mjs']}},now).status,'DEPLOY_INTENTIONALLY_IGNORED');
});
test('aggregate SUCCESS cannot satisfy own-job and exact Preview contract',()=>{
  const t=make('publication',{proof_contract:'COST_AND_EXACT_PREVIEW_V1',status:'WAIT_EXTERNAL'});
  assert.throws(()=>transition(state([t]),t.task_id,{type:'result',sha:t.inputs.sha,input_fingerprint:t.input_fingerprint,result:'PASS',scope:'aggregate run',evidence_sha:'proof'},Date.now()),/CONTRACT_JOB/);
});
test('duplicate runtime probe/attempt IDs preserve ledger revision and next window',()=>{
  let s=state([make('ci',{status:'WAIT_CI',probe:{kind:'github-run'}})]);
  const t=s.tasks[0],now=Date.now();
  const event={type:'result',result:'PENDING',sha:t.inputs.sha,input_fingerprint:t.input_fingerprint,probe_id:'probe-once'};
  s=transition(s,t.task_id,event,now);assert.equal(transition(s,t.task_id,event,now+3600000),s);
  const failure={...event,result:'FAIL',probe_id:undefined,attempt_id:'failure-once',failure:{kind:'read'}};
  s=transition(s,t.task_id,failure,now);assert.equal(transition(s,t.task_id,failure,now+3600000),s);
});
test('pertinent new inputs reset stalled budget; first new no-progress cycle is not suspended',()=>{
  let s=state([make('a',{status:'WAIT_EXTERNAL',no_progress_cycles:2,stalled_on_fingerprint:hash({sha:'a'.repeat(40),contract:'local'})})]);
  const now=Date.now();s=transition(s,'a',{type:'inputs',inputs:{sha:'b'.repeat(40),contract:'local'}},now);
  assert.equal(s.tasks[0].no_progress_cycles,0);s=transition(s,'a',{type:'claim',owner_id:'x',lock_owner:'x'},now);
  s=transition(s,'a',{type:'cycle-complete',owner_id:'x',cycle_id:'new-input-cycle',before_evidence:'same',after_evidence:'same'},now);
  assert.equal(s.tasks[0].status,'READY');assert.equal(s.tasks[0].no_progress_cycles,1);
});
test('ownership bytes changed with same ID cannot persist or release',()=>{
  const f=fixture([make()]);try{
    const p=tick(f.ctx,{worktreeRoot:path.join(f.repo,'cycles')});
    const file=path.join(f.ctx.common,'comun-roadmap-cycle.lock/owner.json'),raw=fs.readFileSync(file,'utf8');
    fs.writeFileSync(file,raw+' ');
    assert.throws(()=>record(f.ctx,{owner_id:p.owner_id,task_id:'a',event:{type:'cycle-complete'}}),/OWNER_BYTES/);
    assert.equal(releaseLock(f.ctx.common,p.owner_id),false);
    fs.writeFileSync(file,raw);record(f.ctx,{owner_id:p.owner_id,task_id:'a',event:{type:'cycle-complete'}});
    f.git('worktree','remove',p.worktree);
  }finally{f.cleanup();}
});
test('runtime enforces 25min and one material push intent; never executes remote action',()=>{
  const now=Date.now(),f=fixture([make()]);let p;
  try{p=tick(f.ctx,{now,worktreeRoot:path.join(f.repo,'cycles')});
    fs.mkdirSync(path.join(p.worktree,'scripts'),{recursive:true});fs.writeFileSync(path.join(p.worktree,'scripts/change.mjs'),'export const delivery=true;');
    execFileSync('git',['-C',p.worktree,'add','.']);execFileSync('git',['-C',p.worktree,'commit','-m','fixture material']);
    const sha=execFileSync('git',['-C',p.worktree,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const loaded=loadState(f.ctx),s=loaded.state;s.tasks[0].inputs.sha=loaded.state.tasks[0].lease.base_sha;s.tasks[0].input_fingerprint=hash(s.tasks[0].inputs);
    saveState(f.ctx,s,loaded.expectedHash,p.owner_id);
    record(f.ctx,{owner_id:p.owner_id,task_id:'a',now,event:{type:'candidate',sha}});
    const intent={type:'operation-intent',operation_id:'first',action:'normal-code-push',expected_sha:sha};
    assert.throws(()=>record(f.ctx,{owner_id:p.owner_id,task_id:'a',now:now+26*60000,event:intent}),/BUDGET/);
    record(f.ctx,{owner_id:p.owner_id,task_id:'a',now,event:intent});
    assert.throws(()=>record(f.ctx,{owner_id:p.owner_id,task_id:'a',now,event:{...intent,operation_id:'second'}}),/ONE_PUSH/);
    record(f.ctx,{owner_id:p.owner_id,task_id:'a',now,event:{type:'reconcile-operation',operation_id:'first',expected_sha:sha,result:'NOT_APPLIED',evidence_sha:hash('no remote action')}});
    record(f.ctx,{owner_id:p.owner_id,task_id:'a',now,event:{type:'cycle-complete'}});
  }finally{if(p?.worktree)f.git('worktree','remove',p.worktree);f.cleanup();}
});
test('additive migration preserves unknown envelope, original evidence and is idempotent under CAS ownership',()=>{
  const f=fixture([make('pr552-cost-publication',{status:'WAIT_EXTERNAL'})]);
  try{const o=acquireLock(f.ctx.common,'migration');assert(o);
    atomicJson(f.ctx.ledger,{remote:REMOTE,common:f.ctx.common,canonical:f.ctx.canonical,state:state([make('pr552-cost-publication',{status:'WAIT_EXTERNAL'})]),unknownV1:{hash:'keep'}});
    const evidence={candidate_sha:'ba872d74474e077d7dcf06800b81523a77ce4433',source_evidence_sha:hash('fixture')};
    const migrated=integrate556(f.ctx,'migration',evidence);assert.equal(migrated.changed,true);
    const raw=fs.readFileSync(f.ctx.ledger,'utf8');assert.deepEqual(JSON.parse(raw).unknownV1,{hash:'keep'});
    assert.equal(integrate556(f.ctx,'migration',evidence).changed,false);assert.equal(fs.readFileSync(f.ctx.ledger,'utf8'),raw);
    assert.deepEqual(migrated.state.tasks[0].evidence,[]);releaseLock(f.ctx.common,'migration');
  }finally{f.cleanup();}
});
test('installed launcher canary and reversible hold: hashes/common-dir enforced before any write',()=>{
  const f=fixture([make('human',{status:'WAIT_HUMAN'}),make('unobserved',{status:'WAIT_EXTERNAL'})]);
  try{
    const install=path.join(f.ctx.common,'installed'),modules=['comun-orch-launcher.mjs','comun-orch-runtime.mjs','comun-orch-v2.mjs','comun-orch-adapter.mjs','orch-v2-candidate.mjs','comun-orch-github-executor.mjs','comun-orch-reconcile.mjs','comun-orch-memory.mjs','comun-orch-ci-diagnostics.mjs','comun-orch-health.mjs','comun-orch-discovery.mjs','comun-orch-rail.mjs'];
    fs.mkdirSync(install);fs.mkdirSync(path.join(f.repo,'scripts/process'),{recursive:true});
    const files={};for(const name of modules){const bytes=fs.readFileSync(fileURLToPath(new URL(name,import.meta.url)));files[name]=hash(bytes.toString());fs.writeFileSync(path.join(install,name),bytes);fs.writeFileSync(path.join(f.repo,'scripts/process',name),bytes);}
    f.git('config','core.autocrlf','false');f.git('add','scripts');f.git('commit','-m','installed fixture source');f.git('update-ref',REF,'HEAD',f.ctx.canonical);
    const manifest={common:f.ctx.common,files};fs.writeFileSync(path.join(install,'manifest.json'),JSON.stringify(manifest));
    const run=(...args)=>spawnSync(process.execPath,[path.join(install,'comun-orch-launcher.mjs'),'tick','--repo',f.repo,...args],{encoding:'utf8'});
    let r=run('--hold');assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).reason,'REVERSIBLE_CANARY_HOLD');assert(!fs.existsSync(f.ctx.ledger));
    r=run();assert.equal(r.status,0,r.stderr);const bytes=fs.readFileSync(f.ctx.ledger),mtime=fs.statSync(f.ctx.ledger).mtimeMs;
    for(let i=0;i<2;i++){r=run();assert.equal(r.status,0,r.stderr);const p=JSON.parse(r.stdout);assert.equal(p.action,'NOOP');assert.equal(p.writes,0);assert.equal(p.notify,false);}
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);assert.equal(fs.statSync(f.ctx.ledger).mtimeMs,mtime);
    const call=(command)=>spawnSync(process.execPath,[path.join(install,'comun-orch-launcher.mjs'),command,'--repo',f.repo],{encoding:'utf8'});
    let diag=call('diagnose');
    assert.equal(diag.status,0,diag.stderr);
    let view=JSON.parse(diag.stdout);
    assert.equal(view.action,'DIAGNOSE');
    assert.equal(view.read_only,true);
    assert.equal(view.would_action,'NOOP');
    assert.equal(view.counts.WAIT_EXTERNAL,1);
    assert.deepEqual(view.unobserved_wait_external,['unobserved']);
    assert.equal(view.requires_reconciliation,true);
    assert.equal(view.writes,0);
    assert.equal(view.worktrees,0);
    assert.equal(view.notify,false);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
    const owned=acquireLock(f.ctx.common,'external-test-owner');
    assert(owned);
    diag=call('diagnose');view=JSON.parse(diag.stdout);
    assert.equal(diag.status,0);
    assert.equal(view.would_action,'PROTECTED_NOOP');
    assert.equal(view.lock,'HELD_LIVE');
    assert.equal(releaseLock(f.ctx.common,'external-test-owner'),true);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
    const invalid=call('not-a-command');
    assert.equal(invalid.status,1);
    const stopped=JSON.parse(invalid.stdout);
    assert.equal(stopped.action,'PROTECTED_STOP');
    assert.equal(stopped.reason,'INVALID_ORCH_COMMAND');
    assert.equal(stopped.requires_attention,true);
    assert.match(stopped.error_fingerprint,/^[a-f0-9]{64}$/);
    assert.equal(stopped.notify,false);
    assert.equal(stopped.writes,null);
    assert.equal(stopped.worktrees,null);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
    fs.writeFileSync(path.join(install,'manifest.json'),JSON.stringify({...manifest,common:path.join(f.repo,'other')}));
    assert.equal(JSON.parse(run().stdout).reason,'COMMON_DIR_CHANGED');
    fs.writeFileSync(path.join(install,'manifest.json'),JSON.stringify(manifest));fs.appendFileSync(path.join(install,'comun-orch-adapter.mjs'),'\n// drift');
    assert.equal(JSON.parse(run().stdout).reason,'INSTALLED_SOURCE_DRIFT');assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
  }finally{f.cleanup();}
});
