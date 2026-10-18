import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createPullRequest,assessDocsMerge,assessLowRiskMerge,mergeExistingPullRequest} from './comun-orch-github-executor.mjs';
import {task,hash,plan} from './comun-orch-v2.mjs';
import {context,acquireLock,releaseLock,ownerProof,atomicJson,loadState,record,REMOTE,REF} from './comun-orch-runtime.mjs';
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

function mergeEvidence(sha) {
  const base='b'.repeat(40);
  return {pr:{number:550,state:'open',draft:false,merged:false,mergeable:true,
      changed_files:1,base:{ref:'main',sha:base,repo:{full_name:repoName}},
      head:{sha,repo:{full_name:repoName}}},
    files:[{filename:'docs/comun-search-usage.md',status:'modified'}],
    runs:{total_count:1,workflow_runs:[{id:17,name:'COMUN CI',head_sha:sha,
      event:'pull_request',status:'completed',conclusion:'success'}]},
    jobs:{total_count:1,jobs:[{id:19,name:'COST-02 / exact checkpoint Preview',
      head_sha:sha,status:'completed',conclusion:'success'}]},
    reviews:[],comments:[]};
}
function mergeFixture() {
  const f=fixture(true),sha=f.t.inputs.sha;
  const envelope=JSON.parse(fs.readFileSync(f.ctx.ledger,'utf8'));
  const t=envelope.state.tasks[0];
  Object.assign(t,{pr_effect:'EXISTING_PR',target_pr:550,work_class:'INTEGRATION',
    action:'integrate-existing-pr',merge_authorization:{scope:'DOCS_ONLY',evidence_sha:'human-proof'}});
  envelope.state.merge_policy={enabled:true,scope:'DOCS_ONLY',source:'human-message',evidence_sha:'human-proof',
    production_effect:{result:'NO_PRODUCTION',base_sha:'b'.repeat(40),evidence_sha:hash('fixture deployment configuration')}};
  fs.writeFileSync(f.ctx.ledger,JSON.stringify(envelope));
  return {...f,evidence:mergeEvidence(sha),mergeRequest:{owner_id:f.id,task_id:'create',
    operation_id:'merge-one',pr_number:550,expected_head_sha:sha}};
}
test('docs merge classification requires exact green CI/COST and excludes runtime and uncertain reviews',()=>{
  const a=mergeEvidence('a'.repeat(40));
  assert.equal(assessDocsMerge(a).mode,'DOCS_ONLY');
  const invalid=[x=>x.pr.draft=true,x=>x.pr.base.ref='other',
    x=>x.pr.mergeable=false,x=>x.files[0].filename='app/page.tsx',
    x=>x.pr.changed_files=2,x=>x.runs.total_count=2,
    x=>x.files[0].filename='docs/comun-product-objective-and-roadmap.md',
    x=>x.files[0].filename='docs/comun-roadmap-hourly-automation.md',
    x=>x.files[0].filename='docs/comun-escola-recovery.md',
    x=>x.runs.workflow_runs[0].status='in_progress',
    x=>x.runs.workflow_runs[0].conclusion='failure',
    x=>{x.runs.total_count=2;x.runs.workflow_runs.push({id:21,name:'Unknown required check',
      head_sha:x.pr.head.sha,event:'pull_request',status:'completed',conclusion:'skipped'});},
    x=>x.jobs.jobs[0].conclusion='failure',
    x=>x.reviews.push({state:'CHANGES_REQUESTED'}),
    x=>x.comments.push({body:'unresolved thread'})];
  for(const mutate of invalid){
    const b=structuredClone(a);mutate(b);
    assert.throws(()=>assessDocsMerge(b),/MERGE_/);
  }
  const conditional=structuredClone(a);
  conditional.runs.total_count=2;
  conditional.runs.workflow_runs.push({id:22,name:'COMUN PR437 Promotion Fingerprint',
    head_sha:a.pr.head.sha,event:'pull_request',status:'completed',conclusion:'skipped'});
  assert.equal(assessDocsMerge(conditional).mode,'DOCS_ONLY');
});
test('docs merge executes once under owner/lease and reads back matching merged SHA',()=>{
  const f=mergeFixture(),mergeSha='c'.repeat(40);let effects=0,reads=0;
  try {
    const r=mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>{reads++;return f.evidence;},
      merge:()=>{effects++;return {merged:true,sha:mergeSha};},
      readback:()=>({state:'closed',merged:true,merge_commit_sha:mergeSha,
        head:{sha:f.mergeRequest.expected_head_sha}}),
      readMain:()=>({status:'identical',merge_base_commit:{sha:mergeSha},head_commit:{sha:mergeSha}}),
    });
    assert.equal(r.merged,true);assert.equal(effects,1);assert.equal(reads,2);
    const s=loadState(f.ctx).state.tasks[0];
    assert.equal(s.operations.at(-1).state,'APPLIED');
    assert.equal(s.operations.at(-1).merge_commit_sha,mergeSha);
    assert.equal(loadState(f.ctx).state.delivery_metrics.merge_count,1);
    assert.equal(loadState(f.ctx).state.delivery_metrics.last_material_delivery_sha,mergeSha);
    assert.throws(()=>mergeExistingPullRequest(f.ctx,{...f.mergeRequest,operation_id:'other'},{
      read:()=>assert.fail('must not read'),merge:()=>assert.fail('must not merge')}),
      /RECONCILE_MERGE_BEFORE_REPEAT/);
  }finally{f.cleanup();}
});
test('stale evidence after intent prevents merge and records NOT_APPLIED',()=>{
  const f=mergeFixture();let reads=0,effects=0;
  try{
    assert.throws(()=>mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>{reads++;const e=structuredClone(f.evidence);
        if(reads===2)e.pr.base.sha='d'.repeat(40);return e;},
      merge:()=>{effects++;return {merged:true,sha:'c'.repeat(40)};}}),
      /MERGE_EVIDENCE_CHANGED_BEFORE_EFFECT/);
    assert.equal(effects,0);assert.equal(reads,2);
    assert.equal(loadState(f.ctx).state.tasks[0].operations.at(-1).state,'NOT_APPLIED');
  }finally{f.cleanup();}
});
test('provider timeout preserves uncertain merge intent without retry',()=>{
  const f=mergeFixture();let effects=0;
  try{
    assert.throws(()=>mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>f.evidence,merge:()=>{effects++;throw Error('timeout');}}),/timeout/);
    assert.equal(effects,1);
    assert.equal(loadState(f.ctx).state.tasks[0].operations.at(-1).state,'UNCERTAIN');
    assert.throws(()=>mergeExistingPullRequest(f.ctx,{...f.mergeRequest,operation_id:'new'},{
      read:()=>assert.fail('duplicate read'),merge:()=>assert.fail('duplicate effect')}),
      /RECONCILE_MERGE_BEFORE_REPEAT/);
  }finally{f.cleanup();}
});
test('docs merge is disabled without human-ledger policy, with no provider reads/writes',()=>{
  const f=mergeFixture();
  try {
    const envelope=JSON.parse(fs.readFileSync(f.ctx.ledger,'utf8'));
    delete envelope.state.merge_policy;
    fs.writeFileSync(f.ctx.ledger,JSON.stringify(envelope));
    const bytes=fs.readFileSync(f.ctx.ledger);
    assert.throws(()=>mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>assert.fail('no network'),merge:()=>assert.fail('no network')}),
      /OWNED_AUTHORIZED_MERGE_LEASE_REQUIRED/);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),bytes);
  }finally{f.cleanup();}
});

test('merge result PASS requires same-cycle applied operation, not a guessed commit hash',()=>{
  const f=mergeFixture(),mergedSha='c'.repeat(40);
  const event=(evidence_sha)=>({type:'result',result:'PASS',
    sha:f.mergeRequest.expected_head_sha,
    input_fingerprint:loadState(f.ctx).state.tasks[0].input_fingerprint,
    evidence_sha,scope:'DOCS_ONLY verified merge and exact-source CI/COST-02'});
  try {
    const untouched=fs.readFileSync(f.ctx.ledger);
    assert.throws(()=>record(f.ctx,{owner_id:f.id,task_id:'create',event:event(mergedSha)}),
      /VERIFIED_MERGE_APPLIED_PROOF_REQUIRED/);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),untouched);
    mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>f.evidence,
      merge:()=>({merged:true,sha:mergedSha}),
      readback:()=>({state:'closed',merged:true,merge_commit_sha:mergedSha,
        head:{sha:f.mergeRequest.expected_head_sha}}),
      readMain:()=>({status:'ahead',merge_base_commit:{sha:mergedSha},
        head_commit:{sha:'e'.repeat(40)}}),
    });
    const appliedBytes=fs.readFileSync(f.ctx.ledger);
    assert.throws(()=>record(f.ctx,{owner_id:f.id,task_id:'create',event:event('d'.repeat(40))}),
      /VERIFIED_MERGE_APPLIED_PROOF_REQUIRED/);
    assert.deepEqual(fs.readFileSync(f.ctx.ledger),appliedBytes);
    const completed=record(f.ctx,{owner_id:f.id,task_id:'create',event:event(mergedSha)});
    assert.equal(completed.status,'DONE');
    assert.equal(loadState(f.ctx).state.tasks[0].status,'DONE');
    assert.equal(loadState(f.ctx).state.delivery_metrics.merge_count,1);
  }finally{f.cleanup();}
});

test('PR merged readback without main ancestry stays uncertain and never credits progress',()=>{
  const f=mergeFixture(),mergedSha='c'.repeat(40);
  try{
    assert.throws(()=>mergeExistingPullRequest(f.ctx,f.mergeRequest,{
      read:()=>f.evidence,merge:()=>({merged:true,sha:mergedSha}),
      readback:()=>({state:'closed',merged:true,merge_commit_sha:mergedSha,
        head:{sha:f.mergeRequest.expected_head_sha}}),
      readMain:()=>({status:'diverged',merge_base_commit:{sha:'d'.repeat(40)},
        head_commit:{sha:'e'.repeat(40)}}),
    }),/MERGE_MAIN_ANCESTRY_UNCERTAIN/);
    const s=loadState(f.ctx).state;
    assert.equal(s.tasks[0].operations.at(-1).state,'UNCERTAIN');
    assert.equal(s.delivery_metrics?.merge_count??0,0);
  }finally{f.cleanup();}
});

test('docs merge requires verified Production effect at exact main before intent or PUT',()=>{
  for(const safety of [undefined,{result:'UNKNOWN'},
    {result:'NO_PRODUCTION',base_sha:'d'.repeat(40),evidence_sha:hash('different main')}]) {
    const f=mergeFixture();
    try {
      const envelope=JSON.parse(fs.readFileSync(f.ctx.ledger,'utf8'));
      envelope.state.merge_policy.production_effect=safety;
      fs.writeFileSync(f.ctx.ledger,JSON.stringify(envelope));
      const before=fs.readFileSync(f.ctx.ledger);
      assert.throws(()=>mergeExistingPullRequest(f.ctx,f.mergeRequest,{
        read:()=>f.evidence,merge:()=>assert.fail('Production effect not cleared')}),
        /MERGE_PRODUCTION_/);
      assert.deepEqual(fs.readFileSync(f.ctx.ledger),before);
    }finally{f.cleanup();}
  }
});

function lowRiskEvidence() {
  const e=mergeEvidence('a'.repeat(40));
  e.observed_at=new Date(now).toISOString();
  e.pr.head.ref='existing-code-pr';
  e.files=[{filename:'lib/search/labels.ts',status:'modified',additions:2,deletions:1,
    patch:'@@ -1 +1,2 @@\n-old\n+new\n+label'}];
  e.diff={complete:true,head_sha:e.pr.head.sha,base_sha:e.pr.base.sha,files_sha:hash(e.files)};
  e.checks={complete:true,sha:e.pr.head.sha,required:['quality','security'],
    items:['quality','security'].map(name=>({name,sha:e.pr.head.sha,status:'completed',conclusion:'success'}))};
  e.preview={id:'exact-preview',sha:e.pr.head.sha,state:'READY',source:'git',
    target:'preview',branch:e.pr.head.ref,project:'comun'};
  e.contracts={sha:e.pr.head.sha,diff_sha:hash(e.files),policy_version:1,
    focal_tests:'PASS',quality:'PASS',sensitive_behavior_unchanged:true,evidence_sha:hash('own focal proofs')};
  e.production_effect={base_sha:e.pr.base.sha,result:'NO_PRODUCTION',evidence_sha:hash('fixture production configuration')};
  return e;
}
const lowRiskPolicy=()=>({enabled:true,version:1,scope:'LOW_RISK_CODE',source:'human-message',
  evidence_sha:hash('specific fixture Tier L authorization'),preview_project:'comun',allowed_paths:['lib/search/labels.ts']});

test('Tier L defaults OFF and certified admission never enables a mutation endpoint',()=>{
  assert.throws(()=>assessLowRiskMerge(lowRiskEvidence()),/LOW_RISK_POLICY_REQUIRED/);
  assert.throws(()=>assessLowRiskMerge(lowRiskEvidence(),{...lowRiskPolicy(),enabled:false},now),/POLICY/);
  const result=assessLowRiskMerge(lowRiskEvidence(),lowRiskPolicy(),now);
  assert.equal(result.mode,'LOW_RISK_CODE');assert.equal(result.mutation_enabled,false);
  assert.throws(()=>assessDocsMerge(lowRiskEvidence()),/MERGE_NON_DOCS/);
});

test('Tier L rejects incomplete checks, stale/ancestral Preview, unsafe or oversized diffs and unproven behavior',()=>{
  const mutations=[e=>e.pr.draft=true,e=>e.pr.head.repo.full_name='fork/repo',
    e=>e.pr.base.ref='other',e=>e.pr.mergeable=false,
    e=>e.observed_at=new Date(now-6*60000).toISOString(),
    e=>e.observed_at=new Date(now+1).toISOString(),
    e=>e.files[0].filename='lib/auth/session.ts',e=>e.files[0].filename='lib/../secrets.ts',
    e=>e.files[0].filename='lib/search/other.ts',e=>e.files[0].status='renamed',
    e=>e.files[0].additions=101,e=>delete e.files[0].patch,e=>e.diff.complete=false,
    e=>e.diff.base_sha='c'.repeat(40),e=>e.diff.head_sha='c'.repeat(40),
    e=>e.checks.complete=false,e=>e.checks.required.push('missing'),
    e=>e.checks.items[0].sha='c'.repeat(40),e=>e.checks.items[0].conclusion='skipped',
    e=>e.checks.items[0].status='queued',e=>e.checks.items.push({...e.checks.items[0]}),
    e=>e.jobs.jobs[0].conclusion='failure',e=>e.preview.sha='c'.repeat(40),
    e=>e.preview.state='CANCELED',e=>e.preview.source='cli',e=>e.preview.target='production',
    e=>e.preview.branch='other',e=>e.preview.project='other',e=>delete e.preview.id,
    e=>e.contracts.focal_tests='NOT_RUN',e=>e.contracts.quality='PENDING',
    e=>e.contracts.sha='c'.repeat(40),e=>e.contracts.diff_sha=hash('other diff'),
    e=>e.contracts.sensitive_behavior_unchanged=false,
    e=>e.production_effect.result='UNKNOWN',e=>e.production_effect.base_sha='d'.repeat(40),
    e=>e.comments.push({body:'unresolved'}),e=>e.reviews.push({state:'CHANGES_REQUESTED'})];
  for(const mutate of mutations) {
    const e=lowRiskEvidence();mutate(e);
    assert.throws(()=>assessLowRiskMerge(e,lowRiskPolicy(),now),/LOW_RISK_|MERGE_/);
  }
});
