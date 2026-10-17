import {hash} from './comun-orch-v2.mjs';

export const CI_CATEGORIES=Object.freeze(['CODE','INFRASTRUCTURE','EXTERNAL_DEPENDENCY','QUOTA','CONFIGURATION','INSUFFICIENT_EVIDENCE']);
const sha=s=>/^[a-f0-9]{40}$/.test(s??'');
const digest=s=>/^[a-f0-9]{64}$/.test(s??'');
const rules=[
  ['QUOTA','DOCKER_RATE_LIMIT',/\btoomanyrequests\s*:\s*(?:Rate exceeded|Data limit exceeded)|\bYou have reached your (?:unauthenticated )?pull rate limit\b/i],
  ['EXTERNAL_DEPENDENCY','SUPABASE_PREPARATION_502',/\b(?:Error status|HTTP(?:\/\d(?:\.\d)?)?)\s*:?\s*502\b|\b502 Bad Gateway\b/i],
  ['INFRASTRUCTURE','RUNNER_RESOURCE_FAILURE',/\bNo space left on device\b|\bThe hosted runner.*lost communication\b|\bCannot connect to the Docker daemon\b/i],
  ['CODE','ASSERTION_OR_COMPILATION',/\bAssertionError\b|\berror TS\d{4}:|\bSyntaxError:\s|^\s*FAIL\s+\S/m],
  ['CONFIGURATION','INVALID_CONFIGURATION',/\b(?:Invalid|Unknown) configuration (?:key|option)\b|\bMissing required (?:configuration|environment variable)\b/i],
];

// Logs are data, never instructions. Persist rule identifiers and hashes, not
// raw logs/environment values. An observed symptom is not proof of root cause.
export function diagnoseJob({head_sha,run_id,run_attempt,job,log,log_sha256,complete=true}) {
  if(!sha(head_sha)||!Number.isSafeInteger(run_id)||run_id<=0||!Number.isSafeInteger(run_attempt)||run_attempt<1||
    !Number.isSafeInteger(job?.id)||job.id<=0||job.head_sha!==head_sha||job.run_id!==run_id||
    job.status!=='completed'||job.conclusion!=='failure')throw Error('CI_JOB_SCOPE_REQUIRED');
  const text=typeof log==='string'?log.replace(/\u001b\[[0-9;]*m/g,''):'';
  const failed_steps=(job.steps??[]).filter(s=>s.conclusion==='failure').map(s=>({number:s.number,name:s.name}));
  const preparation=failed_steps.some(s=>/supabase|disposable|descart.vel|reset local/i.test(s.name));
  const signals=rules.filter(([,code,re])=>re.test(text)&&
    (code!=='SUPABASE_PREPARATION_502'||preparation)).map(([category,code])=>({category,code}));
  const categories=[...new Set(signals.map(s=>s.category))].sort();
  const sufficient=complete&&text.length>0&&failed_steps.length>0&&digest(log_sha256);
  const classification=sufficient&&categories.length===1?categories[0]:'INSUFFICIENT_EVIDENCE';
  const diagnosis={version:1,head_sha,run_id,run_attempt,job_id:job.id,job_name:job.name,
    failed_steps,classification,determination:classification==='INSUFFICIENT_EVIDENCE'?'INDETERMINATE':'SUPPORTED_SYMPTOM',
    signals,complete:!!sufficient,log_sha256:digest(log_sha256)?log_sha256:null,
    limitation:categories.length>1?'Multiple symptom categories; causal chain not established':
      classification==='INSUFFICIENT_EVIDENCE'?'Missing, partial or inconclusive failed-step evidence':'Typed symptom only; no runtime authorization or test success'};
  // Stable across timestamps, repeats and runner noise; a new SHA/attempt is a
  // new input, never permission for an automatic third build.
  diagnosis.fingerprint=hash({head_sha,run_id,run_attempt,job_id:job.id,failed_steps,signals,classification});
  diagnosis.evidence_sha=hash(diagnosis);
  return diagnosis;
}

export function recoveryDecision(diagnosis,{now=Date.now(),previous,uncertain=false,protected_task=false}={}) {
  if(!Number.isFinite(now))throw Error('CLOCK_REQUIRED');
  const same=previous?.fingerprint===diagnosis.fingerprint;
  const observed_categories=[...new Set(diagnosis.signals?.map(s=>s.category)??[])];
  let action='WAIT_EVIDENCE',reason='INDETERMINATE_CAUSE';
  if(uncertain){action='RECONCILE_OPERATION';reason='REMOTE_OUTCOME_UNCERTAIN';}
  else if(protected_task){action='WAIT_EXISTING_AUTHORIZATION';reason='PROTECTED_TASK';}
  else if(['CODE','CONFIGURATION'].includes(diagnosis.classification)){
    action='PROPOSE_EXISTING_BRANCH_REPAIR';reason=diagnosis.classification;
  }else if(['QUOTA','INFRASTRUCTURE','EXTERNAL_DEPENDENCY'].includes(diagnosis.classification)){
    action='READ_ONLY_RECHECK_AFTER_COOLDOWN';reason=diagnosis.classification;
  }
  return {version:1,head_sha:diagnosis.head_sha,diagnosis_fingerprint:diagnosis.fingerprint,
    action,reason,observed_categories,repeated:same,notify:!same,
    next_read_at:action==='READ_ONLY_RECHECK_AFTER_COOLDOWN'?new Date(now+86400000).toISOString():null,
    // A provider cooldown is observation recovery, not execution retry credit.
    retry_authorized:false,rerun_authorized:false,dispatch_authorized:false,
    required_evidence:action==='WAIT_EVIDENCE'?'Exact failed-step logs and independent cause evidence':
      'New verified provider/run input or separately selected material repair; retain own-SHA gates'};
}

export function summarizeFailures(diagnostics) {
  const jobs=diagnostics.map(d=>({job_id:d.job_id,classification:d.classification,fingerprint:d.fingerprint,evidence_sha:d.evidence_sha}));
  return {version:1,jobs,fingerprint:hash(jobs)};
}
