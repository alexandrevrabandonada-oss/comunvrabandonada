import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fingerprint, planCycle, recordFailure, observeInputs, notificationDecision,
  classifyPreview, reconcileExternalOutcome, recordCycleResult, recordProbeObservation,
  classifyPrAdmission, COMUN_REPOSITORY } from './orch-v2.mjs';
const now='2026-10-16T16:00:00Z';
const lock={status:'OWNED',ownerId:'cycle-101',verified:true};
const task=(id,status='READY',more={})=>({taskId:id,status,authorized:true,priority:1,dependencies:[],prEffect:'NONE',...more});
const base={headSha:'h'.repeat(40),projectId:'project1',branch:'codex/feature',cost02:'SUCCESS'};
const exact={sha:base.headSha,projectId:base.projectId,branch:base.branch,source:'git',environment:'preview',state:'CANCELED',ignoreReason:'no-runtime-allowlist'};
const ancestor={...exact,sha:'a'.repeat(40),state:'READY'};
const diff={complete:true,ancestorSha:ancestor.sha,headSha:base.headSha,isAncestor:true,files:['tests/visitor-flow.spec.ts','.github/workflows/ci.yml','docs/report.md']};
test('stable fingerprint independent of key order',()=>assert.equal(fingerprint({a:1,b:{x:2,y:3}}),fingerprint({b:{y:3,x:2},a:1})));
test('blocked top priority -> independently eligible task',()=>assert.deepEqual(planCycle({tasks:[task('school','WAIT_HUMAN',{priority:99}),task('search','READY',{priority:8})],now,lock}),{kind:'EXECUTE_ONE',taskId:'search',ownerId:'cycle-101'}));
test('one task per cycle, stable tie-break',()=>assert.equal(planCycle({tasks:[task('b'),task('a')],now,lock}).taskId,'a'));
test('only DONE dependencies count',()=>assert.equal(planCycle({tasks:[task('a','READY',{dependencies:['b']}),task('b','WAIT_EXTERNAL')],now,lock}).kind,'QUIET_NOOP'));
test('unknown dependencies never pass',()=>assert.equal(planCycle({tasks:[task('a','READY',{dependencies:['absent']})],now,lock}).kind,'QUIET_NOOP'));
test('protected operations not eligible',()=>assert.equal(planCycle({tasks:[task('x','READY',{action:'REMOTE_MIGRATION'})],now,lock}).kind,'QUIET_NOOP'));
test('foreign lock forces no writes',()=>assert.equal(planCycle({tasks:[task('a')],now,lock:{status:'LIVE_OTHER',verified:false}}).kind,'PROTECTED_NOOP'));
test('orphan with unknown provenance is protected',()=>assert.equal(planCycle({tasks:[task('a')],now,lock:{status:'ORPHAN_UNKNOWN'}}).reason,'lock-ownership-unverified'));
test('unverified checkpoint fails closed',()=>assert.equal(planCycle({tasks:[task('a')],now,lock,checkpointValid:false}).kind,'PROTECTED_NOOP'));
test('two identical noop cycles have no material work',()=>{const i={tasks:[task('school','WAIT_HUMAN')],now,lock};assert.equal(planCycle(i).kind,'QUIET_NOOP');assert.deepEqual(planCycle(i),planCycle(i))});
test('CI probe only after due time',()=>{const t=task('ci','WAIT_CI',{nextProbeAt:'2026-10-16T16:30:00Z'});assert.equal(planCycle({tasks:[t],now,lock}).kind,'QUIET_NOOP');assert.equal(planCycle({tasks:[t],now:'2026-10-16T16:30:00Z',lock}).kind,'PROBE_ONE')});
test('READY task before low-value probe',()=>assert.equal(planCycle({tasks:[task('ci','WAIT_CI',{nextProbeAt:now}),task('work')],now,lock}).taskId,'work'));
test('first transient failure backoff',()=>{const r=recordFailure(task('a'),{failureFingerprint:'f',attemptId:'run-1',now});assert.equal(r.task.status,'RETRY_BACKOFF');assert.equal(r.task.attemptsForFingerprint,1);assert.equal(planCycle({tasks:[r.task],now,lock}).kind,'QUIET_NOOP')});
test('second identical failure stops further attempts',()=>{const one=recordFailure(task('a'),{failureFingerprint:'f',attemptId:'a1',now}).task;const two=recordFailure(one,{failureFingerprint:'f',attemptId:'a2',now}).task;assert.equal(two.status,'WAIT_EXTERNAL');assert.equal(two.nextProbeAt,null);assert.equal(planCycle({tasks:[two],now:'2026-10-20T00:00:00Z',lock}).kind,'QUIET_NOOP')});
test('same attempt id is idempotent',()=>{const t=recordFailure(task('a'),{failureFingerprint:'f',attemptId:'x',now}).task;assert.equal(recordFailure(t,{failureFingerprint:'f',attemptId:'x',now}).changed,false)});
test('new fingerprint clears retry budget, never unlocks HUMAN',()=>{const r=observeInputs(task('s','WAIT_HUMAN',{inputFingerprint:'old',attemptsForFingerprint:2}),{inputFingerprint:'new',now,eligible:true});assert.equal(r.task.status,'WAIT_HUMAN');assert.equal(r.task.attemptsForFingerprint,0)});
test('unchanged inputs produce no mutation',()=>assert.equal(observeInputs(task('a','READY',{inputFingerprint:'same'}),{inputFingerprint:'same',now,eligible:true}).changed,false));
test('notify only once per blocker fingerprint',()=>{const t=task('captcha','WAIT_HUMAN',{lastNotifiedFingerprint:'a'});assert.equal(notificationDecision(t,'a').kind,'NONE');assert.equal(notificationDecision(t,'b').kind,'NOTIFY_ONCE')});
test('exact READY preview passes',()=>assert.equal(classifyPreview({...base,exact:{...exact,state:'READY'}}).status,'DEPLOY_READY_EXACT'));
test('intentional ignore + equivalent ancestor retains exact requirement',()=>{const x=classifyPreview({...base,exact,ancestor,diff});assert.equal(x.status,'EQUIVALENT_RUNTIME_PREVIEW_PROVEN');assert.equal(x.satisfied,false)});
test('explicit equivalence policy is distinct from exact',()=>assert.equal(classifyPreview({...base,exact,ancestor,diff,exactRequired:false}).satisfied,true));
test('runtime change disqualifies equivalence',()=>assert.equal(classifyPreview({...base,exact,ancestor,diff:{...diff,files:['components/home.tsx']}}).satisfied,false));
test('partial diff disqualifies equivalence',()=>assert.equal(classifyPreview({...base,exact,ancestor,diff:{...diff,complete:false}}).satisfied,false));
test('project mismatch disqualifies equivalence',()=>assert.equal(classifyPreview({...base,exact,ancestor:{...ancestor,projectId:'other'},diff}).satisfied,false));
test('error cancellation not considered intentional ignore',()=>assert.equal(classifyPreview({...base,exact:{...exact,ignoreReason:'other'}}).status,'UNVERIFIED'));
test('deployment ERROR does not pass via COST-02',()=>assert.equal(classifyPreview({...base,exact:{...exact,state:'ERROR'}}).status,'DEPLOY_FAILED'));
test('COST-02 failed blocks preview proof',()=>assert.equal(classifyPreview({...base,cost02:'FAILURE',exact:{...exact,state:'READY'}}).status,'COST_UNPROVEN'));
test('uncertain external side effects never retried blind',()=>assert.equal(reconcileExternalOutcome({operationKind:'CODE_PUSH',outcome:'UNKNOWN',verifiedRemoteResult:'UNKNOWN',idempotencyKey:'x'}).kind,'WAIT_HUMAN'));
test('authoritative remote reconciliation prevents duplication',()=>assert.equal(reconcileExternalOutcome({operationKind:'CODE_PUSH',outcome:'TIMEOUT',verifiedRemoteResult:'COMPLETED',idempotencyKey:'x'}).kind,'ALREADY_DONE'));
test('protected action never permitted by reconciler',()=>assert.equal(reconcileExternalOutcome({operationKind:'REMOTE_MIGRATION',outcome:'UNKNOWN',verifiedRemoteResult:'COMPLETED',idempotencyKey:'x'}).kind,'BLOCK'));
test('invalid state fails closed',()=>assert.throws(()=>planCycle({tasks:[task('a','INVALID')],now,lock}),/INVALID_TASK_STATUS/));
test('CLI produces a read-only plan',()=>{const r=spawnSync(process.execPath,[fileURLToPath(new URL('./orch-v2-cli.mjs',import.meta.url))],{encoding:'utf8',input:JSON.stringify({operation:'plan',args:{tasks:[task('a')],now,lock}})});assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).kind,'EXECUTE_ONE')});
test('CLI cannot invoke unadvertised mutations',()=>{const r=spawnSync(process.execPath,[fileURLToPath(new URL('./orch-v2-cli.mjs',import.meta.url))],{encoding:'utf8',input:'{"operation":"delete-lock","args":{}}'});assert.equal(r.status,2);assert.equal(r.stdout,'')});

test('two no-progress cycles stall a persistently READY task',()=>{
  const one=recordCycleResult(task('work','READY',{inputFingerprint:'sha-a'}),{cycleId:'c1',inputFingerprint:'sha-a',beforeEvidence:'same',afterEvidence:'same',now}).task;
  assert.equal(one.status,'READY');
  const two=recordCycleResult(one,{cycleId:'c2',inputFingerprint:'sha-a',beforeEvidence:'same',afterEvidence:'same',now}).task;
  assert.equal(two.status,'WAIT_EXTERNAL');
  assert.equal(planCycle({tasks:[two,task('independent')],now,lock}).taskId,'independent');
});
test('duplicate cycle evidence does not inflate the stall counter',()=>{
  const x=recordCycleResult(task('x'),{cycleId:'c1',inputFingerprint:'sha-a',beforeEvidence:'v1',afterEvidence:'v1',now}).task;
  assert.equal(recordCycleResult(x,{cycleId:'c1',inputFingerprint:'sha-a',beforeEvidence:'v1',afterEvidence:'v1',now}).changed,false);
});
test('evidence change resets stall budget',()=>{
  const x=recordCycleResult(task('x','READY',{noProgressCycles:1,inputFingerprint:'sha-a'}),{cycleId:'c2',inputFingerprint:'sha-a',beforeEvidence:'v1',afterEvidence:'v2',now}).task;
  assert.equal(x.noProgressCycles,0); assert.equal(x.status,'READY');
});
test('unchanged CI probes use progressively longer read-only windows',()=>{
  const a=recordProbeObservation(task('ci','WAIT_CI',{observationFingerprint:'pending'}),{probeId:'p1',observationFingerprint:'pending',now}).task;
  assert.equal(a.probeNoChangeCount,1); assert.equal(a.nextProbeAt,'2026-10-16T17:00:00.000Z');
  const b=recordProbeObservation(a,{probeId:'p2',observationFingerprint:'pending',now:'2026-10-16T17:00:00Z'}).task;
  assert.equal(b.nextProbeAt,'2026-10-16T21:00:00.000Z');
});
test('duplicate probe id never triggers another write',()=>{
  const a=recordProbeObservation(task('ci','WAIT_CI'),{probeId:'p1',observationFingerprint:'new',now}).task;
  assert.equal(recordProbeObservation(a,{probeId:'p1',observationFingerprint:'new',now}).changed,false);
});
test('new remote observation requalifies only when eligible',()=>{
  const a=recordProbeObservation(task('ci','WAIT_CI',{observationFingerprint:'pending'}),{probeId:'p1',observationFingerprint:'success',eligible:true,now}).task;
  assert.equal(a.status,'READY');
});

const portfolio=(overrides={})=>({
  verified:true,repository:COMUN_REPOSITORY,observedAt:now,
  openCount:22,openPrNumbers:Array.from({length:22},(_,i)=>i+535),
  activeImplementationCount:2,activeIntegrationCount:1,newPrCredits:0,
  ...overrides
});
const createPr=()=>task('new-feature','READY',{prEffect:'NEW_PR',action:'CREATE_PR',priority:100});
test('22 open PRs blocks a new feature PR but not work on existing #545',()=>{
  const integration=task('integrate-545','READY',{prEffect:'EXISTING_PR',targetPr:545,priority:9});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:portfolio(),now}).reason,'integration-debt-mode');
  assert.deepEqual(planCycle({tasks:[createPr(),integration],now,lock,portfolio:portfolio()}),
    {kind:'EXECUTE_ONE',taskId:'integrate-545',ownerId:lock.ownerId});
});
test('a new PR alone is PROTECTED_NOOP during integration debt',()=>{
  const p=planCycle({tasks:[createPr()],now,lock,portfolio:portfolio()});
  assert.equal(p.kind,'PROTECTED_NOOP');
});
test('missing PR-effect declaration fails closed',()=>{
  assert.equal(classifyPrAdmission({task:task('unknown','READY',{prEffect:undefined}),now}).reason,'pr-effect-unclassified');
  assert.equal(planCycle({tasks:[task('unknown','READY',{prEffect:undefined})],now,lock}).kind,'PROTECTED_NOOP');
});
test('declaring NONE cannot bypass a CREATE_PR action',()=>{
  assert.equal(classifyPrAdmission({task:task('rogue','READY',{action:'CREATE_PR'}),now}).admitted,false);
});
test('existing PR tasks must identify target number',()=>{
  assert.equal(classifyPrAdmission({task:task('repair','READY',{prEffect:'EXISTING_PR'}),now}).reason,'existing-pr-not-identified');
});
test('new PR fails closed without current remote inventory',()=>{
  assert.equal(classifyPrAdmission({task:createPr(),now}).reason,'portfolio-unverified-or-stale');
});
test('stale inventory fails closed',()=>{
  const p=portfolio({observedAt:'2026-10-16T15:00:00Z'});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:p,now}).admitted,false);
});
test('mismatched repository fails closed',()=>{
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:portfolio({repository:'other/repo'}),now}).admitted,false);
});
test('inconsistent PR count fails closed',()=>{
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:portfolio({openCount:21}),now}).admitted,false);
});
test('open 5 with no merge/close credit cannot create PR',()=>{
  const p=portfolio({openCount:5,openPrNumbers:[1,2,3,4,5],activeImplementationCount:1,activeIntegrationCount:0});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:p,now}).reason,'no-verified-merge-or-closure-credit');
});
test('active implementation WIP cap blocks new PR even under 5 open',()=>{
  const p=portfolio({openCount:4,openPrNumbers:[1,2,3,4],activeImplementationCount:2,activeIntegrationCount:0,newPrCredits:1});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:p,now}).reason,'active-wip-cap-reached');
});
test('active integration WIP cap blocks new PR even under 5 open',()=>{
  const p=portfolio({openCount:4,openPrNumbers:[1,2,3,4],activeImplementationCount:1,activeIntegrationCount:1,newPrCredits:1});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:p,now}).reason,'active-wip-cap-reached');
});
test('a new PR under cap requires an actual verified credit',()=>{
  const p=portfolio({openCount:4,openPrNumbers:[1,2,3,4],activeImplementationCount:1,activeIntegrationCount:0,newPrCredits:1});
  assert.equal(classifyPrAdmission({task:createPr(),portfolio:p,now}).admitted,true);
});
test('backlog exceptions require explicit human approval and evidence',()=>{
  const t=createPr();
  const exception={...t,exceptionKind:'INTEGRATION_REPAIR',existingPrUnavailable:true,exceptionEvidence:'approved scope documented',exceptionHumanApproved:true};
  assert.equal(classifyPrAdmission({task:exception,portfolio:portfolio(),now}).admitted,true);
  assert.equal(classifyPrAdmission({task:{...exception,exceptionHumanApproved:false},portfolio:portfolio(),now}).admitted,false);
});
test('PR gate does not bypass ownership checks',()=>{
  const p=portfolio({openCount:4,openPrNumbers:[1,2,3,4],activeImplementationCount:0,activeIntegrationCount:0,newPrCredits:1});
  assert.equal(planCycle({tasks:[createPr()],now,portfolio:p,lock:{status:'ORPHAN_UNKNOWN'}}).kind,'PROTECTED_NOOP');
});
