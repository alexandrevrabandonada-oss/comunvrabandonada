import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPullRequest} from './comun-orch-github-executor.mjs';
import {task,hash,plan} from './comun-orch-v2.mjs';
import {context,acquireLock,releaseLock,ownerProof,atomicJson,loadState,REMOTE,REF} from './comun-orch-runtime.mjs';
const now=Date.now(),repoName='alexandrevrabandonada-oss/comunvrabandonada';
function portfolio(count=0){return {verified:true,repository:repoName,observedAt:new Date().toISOString(),openCount:count,openPrNumbers:Array.from({length:count},(_,i)=>500+i),heads:[]};}
function fixture(noNew=false) {
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'comun-pr-boundary-'));
  const git=(...a)=>execFileSync('git',['-C',repo,...a],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  git('init');git('config','user.name','boundary fixture');git('config','user.email','fixture@example.invalid');git('remote','add','origin',REMOTE);
  fs.mkdirSync(path.join(repo,'reports/current'),{recursive:true});fs.writeFileSync(path.join(repo,'reports/current/comun-execution-checkpoint.json'),JSON.stringify({orchV2:{schema_version:2,revision:0,tasks:[]}}));
  git('add','.');git('commit','-m','fixture');git('update-ref',REF,'HEAD');const ctx=context(repo),id='boundary-owner';assert(acquireLock(ctx.common,id));
  const t=task({task_id:'create',priority:1,inputs:{sha:git('rev-parse','HEAD'),contract:'fixture'},status:'RUNNING',owner_id:id,pr_effect:'NEW_PR'});
  t.lease={owner_proof:ownerProof(ctx,id),deadline_at:new Date(now+25*60000).toISOString(),cycle_id:'one'};
  atomicJson(ctx.ledger,{remote:REMOTE,common:ctx.common,canonical:ctx.canonical,state:{schema_version:2,revision:0,tasks:[t],integration_debt:{no_new_prs:noNew,verified_creation_credits:1}}});
  return {repo,ctx,id,t,request:{owner_id:id,task_id:'create',operation_id:'one',body:{head:'fixture-only-branch',base:'main',title:'fixture'}},cleanup(){releaseLock(ctx.common,id);assert(path.resolve(repo).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(repo,{recursive:true});}};
}
test('executor ignores old planner admission: 22 remote PRs block actual creation with zero writes/effects',()=>{
  const f=fixture();try{const bytes=fs.readFileSync(f.ctx.ledger);let effects=0,reads=0;
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>{reads++;return portfolio(22);},create:()=>{effects++;}}),/integration-debt-mode/);
    assert.equal(reads,1);assert.equal(effects,0);assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
  }finally{f.cleanup();}
});
test('second remote check catches race after intent before effect; credit returned under CAS',()=>{
  const f=fixture();try{let reads=0,effects=0;
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>portfolio(++reads===1?0:22),create:()=>{effects++;}}),/remote-changed-before-effect/);
    assert.equal(reads,2);assert.equal(effects,0);const s=loadState(f.ctx).state;
    assert.equal(s.tasks[0].operations[0].state,'NOT_APPLIED');assert.equal(s.integration_debt.verified_creation_credits,1);
  }finally{f.cleanup();}
});
test('mission no-new-PRs stays closed even with a small queue and available credit',()=>{
  const f=fixture(true);try{let effects=0;
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>portfolio(),create:()=>{effects++;}}),/mission-no-new-prs/);
    assert.equal(effects,0);
  }finally{f.cleanup();}
});
test('incomplete or stale remote portfolio never invokes actual API',()=>{
  for(const bad of [{...portfolio(),verified:false},{...portfolio(),observedAt:'2020-01-01T00:00:00Z'}, {...portfolio(1),openPrNumbers:[]}]){
    const f=fixture();try{assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>bad,create:()=>assert.fail('side effect')}),/portfolio-unverified/);}finally{f.cleanup();}
  }
});
test('remote timeout leaves durable UNCERTAIN; restart cannot duplicate creation',()=>{
  const f=fixture();try{let effects=0;
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>portfolio(),create:()=>{effects++;throw Error('timeout');}}),/timeout/);
    assert.equal(loadState(f.ctx).state.tasks[0].operations[0].state,'UNCERTAIN');
    assert.throws(()=>createPullRequest(f.ctx,{...f.request,operation_id:'another'},{fetchPortfolio:()=>portfolio(),create:()=>{effects++;}}),/RECONCILE/);
    assert.equal(effects,1);
  }finally{f.cleanup();}
});
test('boundary cannot open duplicate scope branch',()=>{
  const f=fixture();try{const p={...portfolio(1),heads:[{number:500,branch:f.request.body.head,sha:f.t.inputs.sha}]};
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>p,create:()=>assert.fail('duplicate')}),/EXISTING_PR/);
  }finally{f.cleanup();}
});
test('successful fixture effect is applied once with exact SHA; no real provider called',()=>{
  const f=fixture();try{let effects=0;
    const r=createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>portfolio(),create:()=>{effects++;return {number:99,head:{sha:f.t.inputs.sha}};}});
    assert.equal(r.number,99);assert.equal(effects,1);assert.equal(loadState(f.ctx).state.tasks[0].operations[0].state,'APPLIED');
    assert.throws(()=>createPullRequest(f.ctx,f.request,{fetchPortfolio:()=>portfolio(),create:()=>assert.fail('duplicate')}),/RECONCILE/);
  }finally{f.cleanup();}
});
test('new planner treats unclassified PR effect as protected and keeps existing review eligible',()=>{
  const t=task({task_id:'new',priority:1,inputs:{sha:'a'.repeat(40)},pr_effect:undefined});
  const review=task({task_id:'review',priority:2,inputs:{sha:'b'.repeat(40)},action:'read-only',pr_effect:'EXISTING_PR',target_pr:545,work_class:'INTEGRATION'});
  const s={schema_version:2,revision:0,tasks:[t,review],portfolio:{...portfolio(22),activeImplementationCount:0,activeIntegrationCount:0}};
  assert.equal(plan(s,{now}).selected,'review');
});
