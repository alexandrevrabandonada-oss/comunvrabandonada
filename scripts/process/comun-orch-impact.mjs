// Advisory-only CI scope planner. Never authorizes skipping branch-protection
// checks, deployment, production changes or any GitHub side effect.
export const CI_IMPACT_LANES=Object.freeze([
  'ORCH_V2','EXPERIENCE_COHERENCE','QUALITY_PERFORMANCE',
  'SECURITY_RESILIENCE','SCHEMA_PREFLIGHT',
]);
const ALL=CI_IMPACT_LANES;
const SHA=/^[a-f0-9]{40}$/;
const safePath=s=>typeof s==='string'&&s.length>0&&s.length<=256&&
  s===s.trim()&&!s.startsWith('/')&&!s.includes('\\')&&
  !s.includes('//')&&!s.split('/').some(x=>x==='.'||x==='..')&&
  /^[\w.+@\/\-()[\] ]+$/.test(s);
const sortLanes=s=>ALL.filter(x=>s.has(x));
function scopes(file) {
  if (/^(?:scripts\/process\/(?:comun-orch-|orch-v2-)|scripts\/roadmap\/orch-v2|\.github\/workflows\/comun-orch-v2-contract\.yml)/.test(file))
    return ['ORCH_V2'];
  if (/^\.github\/workflows\/comun-security-resilience\.yml$/.test(file))
    return ['SECURITY_RESILIENCE'];
  if (/^supabase\/|^scripts\/(?:db|security)\/|^\.github\/workflows\/comun-.*preflight.*\.ya?ml$/.test(file))
    return ['QUALITY_PERFORMANCE','SECURITY_RESILIENCE','SCHEMA_PREFLIGHT'];
  if (/^app\/|^components\/|^lib\//.test(file))
    return ['EXPERIENCE_COHERENCE','QUALITY_PERFORMANCE','SECURITY_RESILIENCE'];
  if (/^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig.*\.json|next\.config\.[^/]+|playwright\.[^/]+\.config\.ts)$/.test(file))
    return ['EXPERIENCE_COHERENCE','QUALITY_PERFORMANCE','SECURITY_RESILIENCE'];
  if (/^tests\/experience-coherence\/|^scripts\/experience\/|^docs\/comun-experience-|^\.github\/workflows\/comun-experience-coherence\.yml$/.test(file))
    return ['EXPERIENCE_COHERENCE'];
  if (/^tests\/(?:quality-performance|comun-pwa-experience)\/|^scripts\/quality\/|^docs\/comun-quality-|^\.github\/workflows\/comun-quality-performance\.yml$/.test(file))
    return ['QUALITY_PERFORMANCE'];
  if (/^docs\/comun-security-|^\.github\/workflows\/comun-security-resilience\.yml$/.test(file))
    return ['SECURITY_RESILIENCE'];
  if (/^scripts\/ci\//.test(file))return ALL; // gate implementations may affect every lane
  if (/^(?:docs\/|reports\/|tests\/|README\.md$|CHANGELOG\.md$|CONTRIBUTING\.md$)/.test(file))
    return [];
  return null; // fail closed: unknown paths require all lanes in scope plan
}
function classify(files) {
  const lanes=new Set(),unknown=[];
  for(const file of files){
    const found=scopes(file);
    if(found===null){unknown.push(file);for(const lane of ALL)lanes.add(lane);}
    else for(const lane of found)lanes.add(lane);
  }
  return {lanes:sortLanes(lanes),unknown_paths:unknown};
}
// Both diff views are independent, complete inputs: incremental base is the
// previous commit, while pr_files is merge-base(main)..HEAD. No SHA inheritance.
export function classifyCiImpact({head_sha,incremental_files,pr_files,
  incremental_complete=true,pr_complete=true}={}) {
  const base={version:1,mode:'ADVISORY_ONLY',head_sha:head_sha??null,
    writes:0,authorized_effects:[],branch_protection_unchanged:true,
    mandatory_release_policy:'GATES_AND_PREVIEW_ON_EXACT_HEAD_STILL_REQUIRED'};
  const valid=SHA.test(head_sha??'')&&incremental_complete===true&&pr_complete===true&&
    Array.isArray(incremental_files)&&incremental_files.length>0&&
    Array.isArray(pr_files)&&pr_files.length>0&&
    incremental_files.every(safePath)&&pr_files.every(safePath)&&
    incremental_files.every(p=>pr_files.includes(p));
  if(!valid)return {...base,status:'INDETERMINATE',reason:'INCOMPLETE_OR_INVALID_DIFF_SCOPE',
    fast:{checks:['CORE_STATIC','ORCH_V2'],result:'PROVISIONAL_NOT_RELEASE_EVIDENCE'},
    scope:{lanes:[...ALL],unknown_paths:[]},
    release:{lanes:[...ALL],checks:['CORE_CI','COST_02','EXACT_GIT_PREVIEW','REQUIRED_REVIEWS','APPLICABLE_PREFLIGHTS']},
    deferred_until_release:[]};
  const incremental=classify(incremental_files);
  const cumulative=classify(pr_files);
  const deferred=cumulative.lanes.filter(x=>!incremental.lanes.includes(x));
  return {...base,status:'CLASSIFIED',reason:'EXACT_INCREMENTAL_AND_PR_DIFF',
    fast:{checks:['CORE_STATIC',...(incremental.lanes.includes('ORCH_V2')?['ORCH_V2']:[])],
      result:'PROVISIONAL_NOT_RELEASE_EVIDENCE'},
    scope:incremental,
    release:{lanes:cumulative.lanes,checks:['CORE_CI','COST_02','EXACT_GIT_PREVIEW','REQUIRED_REVIEWS','APPLICABLE_PREFLIGHTS']},
    deferred_until_release:deferred};
}
