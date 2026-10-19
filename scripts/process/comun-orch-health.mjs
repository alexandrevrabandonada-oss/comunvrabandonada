import {hash,plan} from './comun-orch-v2.mjs';
import {inventory,nextObservation,watchSpec} from './comun-orch-reconcile.mjs';

// Independent read-only verifier. It never changes task states, trusts a DONE
// label, launches another writer or certifies merge/Production.
export function verifyCompletion({head_sha,input_fingerprint,evidence=[],dependencies=[],checks,preview,now=Date.now()}) {
  const pending=[];
  if(!/^[a-f0-9]{40}$/.test(head_sha??'')||!/^[a-f0-9]{64}$/.test(input_fingerprint??''))pending.push('INVALID_PROOF_SCOPE');
  if(!evidence.some(e=>e.sha===head_sha&&e.input_fingerprint===input_fingerprint&&e.result==='PASS'&&/^[a-f0-9]{64}$/.test(e.evidence_sha??'')))pending.push('OWN_SHA_PROOF_MISSING');
  for(const d of dependencies)if(d.sha!==head_sha||!d.evidence?.some(e=>e.sha===head_sha&&e.input_fingerprint===d.input_fingerprint&&e.result==='PASS'&&/^[a-f0-9]{64}$/.test(e.evidence_sha??'')))pending.push('DEPENDENCY_OWN_SHA_PROOF_MISSING:'+d.task_id);
  if(checks?.head_sha!==head_sha||checks?.repository!=='alexandrevrabandonada-oss/comunvrabandonada'||checks.complete!==true||
    !Number.isFinite(Date.parse(checks.observed_at))||Date.parse(checks.observed_at)>now||now-Date.parse(checks.observed_at)>30*60000||!Array.isArray(checks.items)||!checks.items.length)pending.push('EXACT_COMPLETE_CHECK_SNAPSHOT_MISSING');
  else {
    for(const name of ['COMUN ORCH-V2 contract','COMUN Quality Performance Deliverability','COMUN Security Resilience Deliverability'])
      if(!checks.items.some(c=>c.workflow===name&&c.sha===head_sha&&c.status==='completed'&&c.conclusion==='success'))pending.push('WORKFLOW_PENDING:'+name);
    if(!checks.items.some(c=>c.name==='COST-02 / exact checkpoint Preview'&&c.sha===head_sha&&c.status==='completed'&&c.conclusion==='success'))pending.push('OWN_COST02_MISSING');
    for(const c of checks.items){
      // Exclusions require an existing versioned policy and source evidence;
      // skipped checks are recorded as excluded, never relabelled PASS.
      const excluded=c.sha===head_sha&&c.status==='completed'&&c.conclusion==='skipped'&&c.applicable===false&&
        ['POST_MERGE_ONLY','INACTIVE_LANE'].includes(c.exclusion?.policy)&&/^[a-f0-9]{64}$/.test(c.exclusion.evidence_sha??'');
      if(!excluded&&(c.sha!==head_sha||c.status!=='completed'||c.conclusion!=='success'))pending.push('CHECK_UNSATISFIED:'+c.name);
    }
  }
  if(preview?.status!=='DEPLOY_READY_EXACT'||preview.sha!==head_sha||preview.source!=='git'||preview.target!=='preview'||
    !preview.project_id||!preview.branch||!preview.id||!/^[a-f0-9]{64}$/.test(preview.evidence_sha??'')||
    !Number.isFinite(Date.parse(preview.observed_at))||Date.parse(preview.observed_at)>now||now-Date.parse(preview.observed_at)>24*3600000)pending.push('EXACT_GIT_PREVIEW_MISSING');
  return {status:pending.length?'PENDING':'VERIFIED_REVIEW_SCOPE_ONLY',head_sha,input_fingerprint,pending:[...new Set(pending)],
    evidence_sha:hash({head_sha,input_fingerprint,evidence,dependencies,checks,preview}),
    authorized_effects:[],scope:'Independent review of supplied own-SHA proofs; never merge, integration or Production'};
}

export function healthSnapshot(state,{now=Date.now(),lock='FREE',observer_control,last_wake=null,no_progress_ms=24*3600000,wake_interval_ms=40*60000}={}) {
  const p=plan(state,{now,lock}),queue=inventory(state,observer_control);
  const observation=lock==='FREE'?nextObservation(state,now,observer_control):null;
  const ordinaryProbes=p.probes.filter(id=>!watchSpec(state.tasks.find(t=>t.task_id===id)));
  const changes=state.tasks.map(t=>t.last_material_change).filter(t=>Number.isFinite(Date.parse(t))).sort();
  const last=changes.at(-1)??null;
  const code=state.tasks.flatMap(t=>t.operations.filter(o=>o.action==='normal-code-push'&&o.state==='APPLIED').map(o=>({task_id:t.task_id,sha:o.expected_sha,evidence_sha:o.evidence_sha??null,task_transition_at:t.last_material_change??null})))
    .sort((a,b)=>(Date.parse(a.task_transition_at)||0)-(Date.parse(b.task_transition_at)||0));
  const blockers=queue.filter(t=>t.status!=='DONE').map(t=>({...t,
    diagnosis:state.tasks.find(x=>x.task_id===t.task_id).ci_diagnostics??null,
    recovery_decisions:state.tasks.find(x=>x.task_id===t.task_id).recovery_decisions??[],
    dependencies:t.dependencies.map(id=>{
    const dep=state.tasks.find(t=>t.task_id===id);return {task_id:id,status:dep?.status,sha:dep?.inputs.sha,
      reason:dep?.status!=='DONE'?'DEPENDENCY_NOT_DONE':dep.target_pr===state.tasks.find(x=>x.task_id===t.task_id).target_pr&&dep.inputs.sha!==t.sha?'DEPENDENCY_HEAD_MISMATCH':null};})}));
  const next=p.action==='RECONCILE'?{kind:'RECONCILE_OWNERSHIP_WITH_PROOF',task_id:p.selected}:
    p.action==='EXECUTE'?{kind:'EXECUTE_ONE',task_id:p.selected}:observation?{kind:'READ_TRACKED_SOURCE',task_id:observation.task_id}:ordinaryProbes.length?{kind:'PROBE',task_id:ordinaryProbes[0]}:null;
  const recurring=state.tasks.filter(t=>t.attempts_for_fingerprint>=2||t.no_progress_cycles>=2).map(t=>({task_id:t.task_id,sha:t.inputs.sha,fingerprint:t.failure_fingerprint,attempts:t.attempts_for_fingerprint,no_progress_cycles:t.no_progress_cycles??0}));
  const due=Object.entries(observer_control?.cursors??{}).filter(([,c])=>c.suspended).map(([task_id,c])=>({task_id,until:c.next_probe_at,reason:'REMOTE_READ_CIRCUIT_OPEN',fingerprint:c.error_fingerprint}));
  // No historical delivery timestamp is inferred: only the live observer memory
  // can establish consecutive cycles without a reconciled APPLIED code push.
  const cycles=observer_control?.delivery_monitor?.cycles_since_delivery;
  const firstDeliveryMissing=Number.isSafeInteger(cycles)&&cycles>=2&&
    !state.delivery_metrics?.last_material_delivery_at&&code.length===0;
  const disabledLanes=firstDeliveryMissing?[
    ...(state.roadmap_discovery?.enabled===true?[]:['ROADMAP_DISCOVERY_DISABLED']),
    ...(state.queue_discovery?.authorization?.scope==='existing-pr-code-repair'?[]:['REPAIR_DISCOVERY_AUTHORIZATION_MISSING']),
    ...(state.merge_policy?.enabled===true?[]:['DOCS_MERGE_POLICY_DISABLED']),
  ]:[];
  const wakeDelay=Number.isFinite(Date.parse(last_wake))?now-Date.parse(last_wake):null;
  const missedWake=wakeDelay!==null&&wakeDelay>2*wake_interval_ms;
  const prolonged=!!last&&now-Date.parse(last)>=no_progress_ms;
  const stalled=firstDeliveryMissing||recurring.some(t=>t.no_progress_cycles>=2)||(prolonged&&next?.kind==='EXECUTE_ONE');
  return {version:1,read_only:true,last_wake,last_wake_delay_ms:wakeDelay,missed_wake:missedWake,last_task_transition:last,
    delivery_metrics:{...(state.delivery_metrics??{}),
      elapsed_ms:state.delivery_metrics?.last_material_delivery_at ? now-Date.parse(state.delivery_metrics.last_material_delivery_at) : null,
      cycles_since_delivery:observer_control?.delivery_monitor?.cycles_since_delivery ?? null,
      basis:'Only reconciled APPLIED normal-code-push; observations and task transitions are not deliveries'},
    last_material_progress:code.at(-1)??null,material_progress_time:'UNKNOWN_UNLESS_RECORDED_BY_OPERATION',
    first_delivery_stall:firstDeliveryMissing?{reason:'NO_MATERIAL_DELIVERY_AFTER_REPEATED_CYCLES',
      cycles_since_delivery:cycles,disabled_lanes:disabledLanes,
      scope:'Read-only evidence; does not authorize grants, merges, pushes or Production'}:null,
    state:lock!=='FREE'?'PROTECTED':missedWake?'MISSED_WAKE':p.action==='RECONCILE'?'RECOVERY_REQUIRED':stalled?'STALLED':!last?'UNKNOWN':next?'ACTIONABLE':'WAITING',
    prolonged_no_progress:prolonged,
    next_action:next,noop_reason:next?null:lock!=='FREE'?lock:recurring.length?'NO_ELIGIBLE_TASK_FAILURE_OR_NO_PROGRESS_BUDGET_EXHAUSTED':due.length?'READ_COOLDOWN_ACTIVE':firstDeliveryMissing?'NO_MATERIAL_DELIVERY_AFTER_REPEATED_CYCLES':'WAITING_FOR_DEPENDENCIES_OR_EXTERNAL_EVIDENCE',
    blockers,recurring_failures:recurring,circuit_breakers:due,queue,notify:false,writes:0,worktrees:0};
}

export function reviewPortfolio(snapshot,now=Date.now()) {
  if(snapshot?.repository!=='alexandrevrabandonada-oss/comunvrabandonada'||snapshot.complete!==true||!Array.isArray(snapshot.prs)||
    snapshot.prs.length>=100||new Set(snapshot.prs.map(p=>p.number)).size!==snapshot.prs.length||
    !Number.isFinite(Date.parse(snapshot.observed_at))||Date.parse(snapshot.observed_at)>now||now-Date.parse(snapshot.observed_at)>30*60000)throw Error('FRESH_COMPLETE_PORTFOLIO_REQUIRED');
  const prs=snapshot.prs.map(p=>{const checks=p.statusCheckRollup??[],bad=checks.filter(c=>c.conclusion&& !['SUCCESS','SKIPPED','NEUTRAL'].includes(c.conclusion));
    const stack=[511,512,513,514,515].includes(p.number);
    return {pr:p.number,sha:p.headRefOid,branch:p.headRefName,base:p.baseRefName,draft:p.isDraft,
      priority:stack?0:bad.length?1:2,decision:stack?'REVIEW_UNIQUE_STACK_DELTAS':bad.length?'DIAGNOSE_EXISTING_BRANCH':'REVIEW_EXISTING_PR',
      failed_checks:bad.map(c=>c.name),dependencies:stack?[511,512,513,514,515].filter(n=>n<p.number):[],
      merge_authorized:false,close_authorized:false,new_pr_authorized:false};});
  return {repository:snapshot.repository,observed_at:snapshot.observed_at,open_count:prs.length,no_new_prs:true,
    mode:prs.length>5?'INTEGRATION_DEBT':'REVIEW_EXISTING',limits:{implementations:2,integrations:1},
    reviews:prs.sort((a,b)=>a.priority-b.priority||a.pr-b.pr),evidence_sha:hash(snapshot),scope:'Review prioritization only; not integration or closure'};
}
