import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {hash} from './comun-orch-v2.mjs';
import {ownerProof,loadState,canonicalCAS,REF,REMOTE} from './comun-orch-runtime.mjs';

export const MODULES = Object.freeze(['comun-orch-launcher.mjs','comun-orch-runtime.mjs',
  'comun-orch-v2.mjs','comun-orch-adapter.mjs','orch-v2-candidate.mjs',
  'comun-orch-github-executor.mjs','comun-orch-reconcile.mjs','comun-orch-memory.mjs',
  'comun-orch-ci-diagnostics.mjs','comun-orch-health.mjs','comun-orch-discovery.mjs']);
const git=(repo,args,options={})=>execFileSync('git',['-C',repo,...args],{
  timeout:30000,stdio:['pipe','pipe','pipe'],...options});
const text=(repo,...args)=>git(repo,args,{encoding:'utf8'}).trim();

// The source tree is read via Git objects. The original checkout is never edited.
export function consolidateRuntime(ctx,owner_id,sourceRepo,sourceSha,files=MODULES.map(n=>`scripts/process/${n}`)) {
  const proof=ownerProof(ctx,owner_id),ledgerHash=loadState(ctx).expectedHash;
  if(text(sourceRepo,'rev-parse','HEAD')!==sourceSha || text(sourceRepo,'status','--porcelain') ||
      path.resolve(text(sourceRepo,'rev-parse','--path-format=absolute','--git-common-dir'))!==path.resolve(ctx.common) ||
      text(sourceRepo,'remote','get-url','origin')!==REMOTE)throw Error('CLEAN_OWNED_SOURCE_REQUIRED');
  if(files.some(f=>!/^scripts\/process\/comun-orch-[a-z0-9.-]+$/.test(f) &&
      f!=='scripts/process/orch-v2-candidate.mjs' && !/^docs\/comun-orch-v2-[a-z.-]+$/.test(f) &&
      f!=='.github/workflows/comun-orch-v2-contract.yml' && !/^reports\/current\/comun-orch-resilience-[a-z0-9.-]+$/.test(f)))
    throw Error('RELEASE_SCOPE_DENIED');
  const index=path.join(ctx.common,'comun-orch-v2',`release-${randomUUID()}.index`);
  const env={...process.env,GIT_INDEX_FILE:index};
  try {
    git(ctx.repo,['read-tree',ctx.canonical],{env});
    for(const file of files){
      const entry=text(sourceRepo,'ls-tree',sourceSha,'--',file).match(/^(\d+) blob ([a-f0-9]{40})\t/);
      if(!entry)throw Error('RELEASE_BLOB_REQUIRED');
      git(ctx.repo,['update-index','--add','--cacheinfo',`${entry[1]},${entry[2]},${file}`],{env});
    }
    const tree=git(ctx.repo,['write-tree'],{env,encoding:'utf8'}).trim();
    const candidate=git(ctx.repo,['commit-tree',tree,'-p',ctx.canonical],{
      input:`Consolidate tested ORCH-V2 source ${sourceSha}; preserve operational/V1 state\n`,encoding:'utf8'}).trim();
    if(ownerProof(ctx,owner_id)!==proof || loadState(ctx).expectedHash!==ledgerHash)throw Error('RELEASE_CAS_CONFLICT');
    const stable=`refs/comun/roadmap-cycles/resilience-release-${sourceSha.slice(0,12)}`;
    canonicalCAS(ctx.repo,candidate,ctx.canonical,stable);
    return {canonical:candidate,previous_canonical:ctx.canonical,source_sha:sourceSha,files,stable,ledger_hash:ledgerHash};
  }finally{if(fs.existsSync(index))fs.unlinkSync(index);}
}

export function stageRelease(ctx,sourceRepo,sourceSha,directory) {
  if(fs.existsSync(directory))throw Error('RELEASE_ALREADY_EXISTS');
  fs.mkdirSync(directory,{recursive:true});
  const files={};
  for(const name of MODULES){const bytes=git(sourceRepo,['show',`${sourceSha}:scripts/process/${name}`]);
    files[name]=hash(bytes.toString());fs.writeFileSync(path.join(directory,name),bytes,{flag:'wx'});}
  const manifest={source_sha:sourceSha,canonical:ctx.canonical,candidate_sha:'cda454e93e86d544f3b695bb1be7477c1fe1e5c6',
    common:ctx.common,ledger_schema:2,observer_schema:1,files};
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  return manifest;
}

export function canary(repo,directory) {
  for(const args of [['diagnose'],['tick','--hold']]){
    const p=spawnSync(process.execPath,[path.join(directory,'comun-orch-launcher.mjs'),...args,'--repo',repo],{encoding:'utf8',timeout:30000});
    if(p.status!==0)throw Error(`RELEASE_CANARY_FAILED:${p.stdout.trim()}`);
    const r=JSON.parse(p.stdout);
    if(r.writes!==0 || r.worktrees!==0 || (args[0]==='diagnose' ? r.action!=='DIAGNOSE' : r.reason!=='REVERSIBLE_CANARY_HOLD'))
      throw Error('RELEASE_CANARY_INVALID');
  }
  return {verified:true,manifest_sha:hash(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'))};
}

// Roll back by a descendant commit restoring ONLY changed release paths. Never
// rewind a ref/checkpoint/ledger or destroy a concurrent owner's source.
export function rollbackRuntime(ctx,owner_id,release) {
  ownerProof(ctx,owner_id);
  if(text(ctx.repo,'rev-parse',REF)!==release.canonical)throw Error('ROLLBACK_CONCURRENT_REF_PRESERVED');
  const index=path.join(ctx.common,'comun-orch-v2',`rollback-${randomUUID()}.index`),env={...process.env,GIT_INDEX_FILE:index};
  try {
    git(ctx.repo,['read-tree',release.canonical],{env});
    for(const f of release.files){
      const entry=text(ctx.repo,'ls-tree',release.previous_canonical,'--',f).match(/^(\d+) blob ([a-f0-9]{40})\t/);
      if(entry)git(ctx.repo,['update-index','--add','--cacheinfo',`${entry[1]},${entry[2]},${f}`],{env});
      else git(ctx.repo,['update-index','--force-remove',f],{env});
    }
    const tree=git(ctx.repo,['write-tree'],{env,encoding:'utf8'}).trim();
    const candidate=git(ctx.repo,['commit-tree',tree,'-p',release.canonical],{input:'Revert failed ORCH-V2 activation; preserve ledger and V1\n',encoding:'utf8'}).trim();
    canonicalCAS(ctx.repo,candidate,release.canonical,`refs/comun/roadmap-cycles/resilience-rollback-${randomUUID()}`);
    return {canonical:candidate,restored_source:release.previous_canonical,ledger_hash:loadState({...ctx,canonical:candidate}).expectedHash};
  }finally{if(fs.existsSync(index))fs.unlinkSync(index);}
}
