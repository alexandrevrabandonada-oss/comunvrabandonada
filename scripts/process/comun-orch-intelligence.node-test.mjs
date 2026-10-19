import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {task,hash}from'./comun-orch-v2.mjs';
import {diagnoseJob,recoveryDecision,CI_CATEGORIES}from'./comun-orch-ci-diagnostics.mjs';
import {healthSnapshot,verifyCompletion,reviewPortfolio}from'./comun-orch-health.mjs';
import {applyObservation,readTracked,reconcileOne,nextObservation,REPOSITORY}from'./comun-orch-reconcile.mjs';
import {readControl,controlBlock}from'./comun-orch-memory.mjs';
const A='a'.repeat(40),B='b'.repeat(40),NOW=Date.parse('2026-10-17T21:00:00Z');
const job={id:1,run_id:2,head_sha:A,name:'pr-lane',status:'completed',conclusion:'failure',steps:[{number:9,name:'Supabase descartável — reset local',conclusion:'failure'}]};
const diagnose=(log,more={})=>diagnoseJob({head_sha:A,run_id:2,run_attempt:1,job,log,log_sha256:hash(log??''),...more});
const workflow=()=>task({task_id:'pr556-quality',priority:1,status:'WAIT_EXTERNAL',action:'read-only',pr_effect:'EXISTING_PR',target_pr:556,
  inputs:{sha:A,run:2,contract:'COMUN Quality Performance Deliverability: aggregate workflow conclusion on exact head only'},probe:{kind:'github-run',pr:556},attempts_for_fingerprint:2});
const state=tasks=>({schema_version:2,revision:0,tasks,integration_debt:{no_new_prs:true}});
const run={id:2,name:'COMUN Quality Performance Deliverability',head_sha:A,event:'pull_request',status:'completed',conclusion:'failure',run_attempt:1,repository:{full_name:REPOSITORY}};
const provider=route=>route.includes('/pulls/')?{number:556,state:'open',base:{repo:{full_name:REPOSITORY}},head:{sha:A,ref:'existing',repo:{full_name:REPOSITORY}}}:
  route.includes('/jobs?')?{total_count:1,jobs:[job]}:{total_count:1,workflow_runs:[run]};

test('typed evidence covers all six categories and retains inconclusive/mixed causes',()=>{
  for(const [log,expected]of [['toomanyrequests: Data limit exceeded','QUOTA'],['Error status 502: Bad Gateway','EXTERNAL_DEPENDENCY'],
    ['No space left on device','INFRASTRUCTURE'],['AssertionError: expected actual','CODE'],['Missing required configuration key','CONFIGURATION'],
    ['process exited 1','INSUFFICIENT_EVIDENCE']])assert.equal(diagnose(log).classification,expected);
  assert.equal(CI_CATEGORIES.length,6);
  assert.equal(diagnose('toomanyrequests: Rate exceeded\nError status 502:').determination,'INDETERMINATE');
  assert.equal(diagnose(null).classification,'INSUFFICIENT_EVIDENCE');
  assert.equal(diagnose('AssertionError: x',{complete:false}).determination,'INDETERMINATE');
  assert.throws(()=>diagnose('x',{job:{...job,head_sha:B}}),/SCOPE/);
  assert.equal(diagnose('abc502def').signals.length,0);
});
test('fingerprints exclude timestamps, counts, credentials and runner noise; bind SHA/attempt',()=>{
  const a=diagnose('2026-10-17T21:00:00Z toomanyrequests: Rate exceeded\nTOKEN=do-not-persist');
  const b=diagnose('2026-10-18T21:00:00Z toomanyrequests: Rate exceeded\nrunner-other');
  assert.equal(a.fingerprint,b.fingerprint);assert(!JSON.stringify(a).includes('do-not-persist'));
  assert.notEqual(a.fingerprint,diagnose('toomanyrequests: Rate exceeded',{run_attempt:2}).fingerprint);
});
test('cause-conditioned recovery never reruns or spends retry credit; repeated incident is quiet',()=>{
  const d=diagnose('toomanyrequests: Rate exceeded');const r=recoveryDecision(d,{now:NOW});
  assert.equal(Date.parse(r.next_read_at)-NOW,86400000);assert.equal(r.retry_authorized,false);assert.equal(r.rerun_authorized,false);
  assert.equal(recoveryDecision(d,{now:NOW,previous:d}).notify,false);
  assert.equal(recoveryDecision(diagnose('AssertionError: x'),{now:NOW}).action,'PROPOSE_EXISTING_BRANCH_REPAIR');
  assert.equal(recoveryDecision(diagnose(null),{now:NOW}).action,'WAIT_EVIDENCE');
  assert.equal(recoveryDecision(d,{now:NOW,uncertain:true}).action,'RECONCILE_OPERATION');
  assert.equal(recoveryDecision(d,{now:NOW,protected_task:true}).action,'WAIT_EXISTING_AUTHORIZATION');
});
test('real V1 contradiction: quoted diff is not a Docker outage; failed whitespace command is CODE',()=>{
  const diffJob={...job,steps:[{number:12,name:'Run git diff --check origin/main...HEAD',conclusion:'failure'}]};
  const log=['2026-10-17T22:00:00Z ##[group]Run supabase start',
    '2026-10-17T22:00:01Z Error response from daemon: toomanyrequests: Rate exceeded',
    '2026-10-17T22:00:02Z ##[group]Run git diff --check origin/main...HEAD',
    '2026-10-17T22:00:03Z ##[endgroup]',
    '2026-10-17T22:00:04Z report.json:1: trailing whitespace.',
    '2026-10-17T22:00:05Z +  "cause": "toomanyrequests: Rate exceeded",',
    '2026-10-17T22:00:06Z +  "test": "AssertionError: printed source",',
    '2026-10-17T22:00:07Z ##[error]Process completed with exit code 2.'].join('\n');
  const d=diagnose(log,{job:diffJob});assert.equal(d.classification,'CODE');assert.equal(d.log_scope,'FAILED_COMMAND');
  assert.deepEqual(d.signals,[{category:'CODE',code:'DIFF_WHITESPACE'}]);
  assert.equal(recoveryDecision(d).action,'PROPOSE_EXISTING_BRANCH_REPAIR');
  assert.equal(diagnose('+toomanyrequests: Rate exceeded',{job:diffJob}).classification,'INSUFFICIENT_EVIDENCE');
});
test('unresolved structured failed command stays indeterminate despite matching earlier log text',()=>{
  assert.equal(diagnose('##[group]setup\ntoomanyrequests: Rate exceeded\n##[error]unknown failure').determination,'INDETERMINATE');
});
test('reconciler reads exact failed jobs/logs once; diagnosis enrichment never resets exhausted budget',()=>{
  const t=workflow();let reads=0;const source=readTracked(t,provider,()=>{reads++;return 'Error status 502: Bad Gateway';});
  assert.equal(reads,1);assert.equal(source.diagnostics.jobs[0].classification,'EXTERNAL_DEPENDENCY');
  const s=state([t]),next=applyObservation(s,t.task_id,source,NOW),n=next.tasks[0];
  assert.equal(n.attempts_for_fingerprint,2);assert.equal(n.status,'WAIT_EXTERNAL');
  assert.deepEqual(n.inputs,t.inputs);assert.equal(n.evidence.length,0);assert.equal(n.input_fingerprint,t.input_fingerprint);
  const cached=readTracked(n,provider,()=>{throw Error('must not fetch unchanged logs');});
  assert.equal(applyObservation(next,t.task_id,cached,NOW+1),next);
  assert.throws(()=>applyObservation(s,t.task_id,{...source,diagnostics:{...source.diagnostics,head_sha:B}},NOW),/SCOPE/);
});
test('partial inventory, unavailable logs and a moving HEAD remain indeterminate without proof transfer',()=>{
  const t=workflow();const unavailable=readTracked(t,provider,()=>{throw Error('HTTP 403');});
  assert.equal(unavailable.diagnostics.complete,false);assert.equal(unavailable.diagnostics.jobs[0].determination,'INDETERMINATE');
  const partial=readTracked(t,route=>route.includes('/jobs?')?{total_count:101,jobs:[]}:provider(route));
  assert.equal(partial.diagnostics.reason,'FAILED_JOB_EVIDENCE_INCOMPLETE');
  let n=0;assert.throws(()=>readTracked(t,route=>route.includes('/pulls/')&&++n===2?{head:{sha:B}}:provider(route),()=>''),/HEAD_MOVED/);
});
test('unavailable job logs share daily circuit and recover on unchanged failed HEAD without renewed execution credit',()=>{
  let s=state([workflow()]),c,at=NOW,calls=0,alerts=0;
  const read=t=>readTracked(t,provider,()=>{calls++;throw Error('HTTP 502');});
  for(let i=0;i<2;i++){const r=reconcileOne(s,s.tasks[0],at,read,c);s=r.state;c=r.observer_control;
    alerts+=r.notifications.length;at=Date.parse(r.observation.next_probe_at);}
  assert.equal(calls,2);assert.equal(alerts,1);assert.equal(nextObservation(s,at-1,c),null);
  const recovered=reconcileOne(s,s.tasks[0],at,t=>readTracked(t,provider,()=>{calls++;return 'toomanyrequests: Rate exceeded';}),c);
  assert.equal(calls,3);assert.equal(recovered.observer_control.cursors['pr556-quality'].read_failures,0);
  assert.equal(recovered.state.tasks[0].attempts_for_fingerprint,2);
  assert.equal(recovered.state.tasks[0].ci_diagnostics.jobs[0].classification,'QUOTA');
  assert.equal(recovered.notifications.length,0);
});
test('two failures, daily circuit, process-memory roundtrip and same-head recovery do not mutate operational state',()=>{
  const t=workflow(),s=state([t]),before=JSON.stringify(s);let c,at=NOW,alerts=0;
  for(let i=0;i<2;i++){const r=reconcileOne(s,t,at,()=>{throw Error('HTTP 502');},c);c=r.observer_control;alerts+=r.notifications.length;at=Date.parse(r.observation.next_probe_at);}
  assert.equal(alerts,1);assert.equal(nextObservation(s,at-1,c),null);
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'comun-intelligence-'));
  try{const file=path.join(dir,'memory.md');fs.writeFileSync(file,controlBlock(c));c=readControl(file);
    assert.equal(nextObservation(s,at,c).task_id,t.task_id);
    const again=reconcileOne(s,t,at,()=>{throw Error('HTTP 502');},c);assert.equal(again.notifications.length,0);
    const recovered=reconcileOne(s,t,at,()=>({repository:REPOSITORY,kind:'workflow',pr:556,sha:A,branch:'existing',run}),c);
    assert.equal(recovered.observer_control.cursors[t.task_id].suspended,false);
    assert.equal(recovered.observer_control.cursors[t.task_id].read_failures,0);
    assert.equal(JSON.stringify(s),before);
  }finally{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true});}
});
test('health distinguishes interrupted work, prolonged no-progress, provider cooldown and independent eligible action',()=>{
  const human=task({task_id:'human',priority:0,status:'WAIT_HUMAN',inputs:{sha:A},last_material_change:new Date(NOW-2*86400000).toISOString()});
  let h=healthSnapshot(state([human]),{now:NOW,last_wake:new Date(NOW).toISOString()});
  assert.equal(h.state,'WAITING');assert(h.noop_reason);assert(h.prolonged_no_progress);assert.equal(h.last_material_progress,null);
  const independent=task({task_id:'fix',priority:1,action:'local-code',inputs:{sha:A},pr_effect:'EXISTING_PR',target_pr:556});
  h=healthSnapshot(state([human,independent]),{now:NOW});assert.equal(h.next_action.task_id,'fix');assert.equal(h.state,'STALLED');
  h=healthSnapshot(state([human,independent]),{now:NOW,lock:'ORPHAN_UNKNOWN'});assert.equal(h.next_action,null);assert.equal(h.noop_reason,'ORPHAN_UNKNOWN');
  assert.equal(healthSnapshot(state([human]),{now:NOW,last_wake:new Date(NOW-81*60000).toISOString()}).state,'MISSED_WAKE');
  independent.status='RUNNING';independent.owner_id='interrupted';h=healthSnapshot(state([human,independent]),{now:NOW});
  assert.equal(h.next_action.kind,'RECONCILE_OWNERSHIP_WITH_PROOF');assert.equal(h.next_action.task_id,'fix');
});
test('repeated native-like cycles without recorded first code delivery are STALLED, not UNKNOWN',()=>{
  const control={version:1,cursors:{},delivery_monitor:{last_material_delivery_at:null,cycles_since_delivery:3}};
  const s=state([]);
  const h=healthSnapshot(s,{now:NOW,observer_control:control,last_wake:new Date(NOW).toISOString()});
  assert.equal(h.state,'STALLED');
  assert.equal(h.noop_reason,'NO_MATERIAL_DELIVERY_AFTER_REPEATED_CYCLES');
  assert.equal(h.first_delivery_stall.cycles_since_delivery,3);
  assert.deepEqual(h.first_delivery_stall.disabled_lanes,[
    'ROADMAP_DISCOVERY_DISABLED','REPAIR_DISCOVERY_AUTHORIZATION_MISSING','DOCS_MERGE_POLICY_DISABLED']);
  assert.equal(h.next_action,null);assert.equal(h.notify,false);
  assert.equal(h.writes,0);assert.equal(h.worktrees,0);
  const fresh=healthSnapshot(s,{now:NOW,observer_control:{
    ...control,delivery_monitor:{last_material_delivery_at:null,cycles_since_delivery:1}}});
  assert.equal(fresh.state,'UNKNOWN');assert.equal(fresh.first_delivery_stall,null);
  const authorized=state([]);authorized.roadmap_discovery={enabled:true};
  authorized.queue_discovery={authorization:{scope:'existing-pr-code-repair'}};
  authorized.merge_policy={enabled:true};
  const configured=healthSnapshot(authorized,{now:NOW,observer_control:control});
  assert.equal(configured.state,'STALLED');
  assert.deepEqual(configured.first_delivery_stall.disabled_lanes,[]);
  const delivered=state([task({task_id:'delivered',priority:1,status:'WAIT_EXTERNAL',inputs:{sha:A},
    operations:[{action:'normal-code-push',state:'APPLIED',expected_sha:A,evidence_sha:hash('applied')}]})]);
  assert.equal(healthSnapshot(delivered,{now:NOW,observer_control:control}).first_delivery_stall,null);
});
const proof=()=>({head_sha:A,input_fingerprint:hash(A),evidence:[{sha:A,input_fingerprint:hash(A),result:'PASS',evidence_sha:hash('proof')}],
 checks:{head_sha:A,repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),items:
  ['COMUN ORCH-V2 contract','COMUN Quality Performance Deliverability','COMUN Security Resilience Deliverability','COMUN CI'].map((workflow,i)=>({workflow,name:i===3?'COST-02 / exact checkpoint Preview':workflow,sha:A,status:'completed',conclusion:'success'}))},
 preview:{status:'DEPLOY_READY_EXACT',sha:A,source:'git',target:'preview',project_id:'p',branch:'existing',id:'dpl_fixture',evidence_sha:hash('preview'),observed_at:new Date(NOW).toISOString()},now:NOW});
test('independent verifier denies stale SHA, missing/partial checks, skipped/failed checks and cancelled Preview',()=>{
  assert.equal(verifyCompletion({}).status,'PENDING');
  assert.equal(verifyCompletion(proof()).status,'VERIFIED_REVIEW_SCOPE_ONLY');
  for(const mutate of [p=>p.evidence[0].sha=B,p=>p.checks.head_sha=B,p=>p.checks.complete=false,p=>p.checks.items[1].conclusion='failure',
    p=>p.checks.items[1].conclusion='skipped',p=>p.preview.status='CANCELED',p=>p.preview.sha=B,p=>p.preview.observed_at='2020-01-01',
    p=>p.dependencies=[{task_id:'predecessor',sha:B,input_fingerprint:hash(A),evidence:p.evidence}]]){
    const p=proof();mutate(p);assert.equal(verifyCompletion(p).status,'PENDING');
  }
  const p=proof();p.checks.items.push({name:'schema',sha:A,status:'completed',conclusion:'failure',applicable:false,exclusion:{policy:'INACTIVE_LANE',evidence_sha:hash('x')}});
  assert.equal(verifyCompletion(p).status,'PENDING');assert.deepEqual(verifyCompletion(p).authorized_effects,[]);
});
test('portfolio remains evidence of one roadmap: exact branches, stack dependencies and no creation/merge/closure',()=>{
  const snapshot={repository:REPOSITORY,complete:true,observed_at:new Date(NOW).toISOString(),prs:[511,512,515,545].map(number=>({number,headRefOid:A,headRefName:'existing-'+number,baseRefName:'main',statusCheckRollup:[]}))};
  const review=reviewPortfolio(snapshot,NOW);assert.equal(review.open_count,4);assert(review.no_new_prs);
  assert.deepEqual(review.reviews.find(p=>p.pr===515).dependencies,[511,512,513,514]);
  assert(review.reviews.every(p=>!p.merge_authorized&&!p.close_authorized&&!p.new_pr_authorized));
  assert.throws(()=>reviewPortfolio({...snapshot,complete:false},NOW),/PORTFOLIO/);
  assert.throws(()=>reviewPortfolio(snapshot,NOW+86400000),/PORTFOLIO/);
});
