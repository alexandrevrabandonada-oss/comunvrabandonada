import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyCiImpact,CI_IMPACT_LANES} from './comun-orch-impact.mjs';
const SHA='a'.repeat(40);
const assess=(delta,pr=delta)=>classifyCiImpact({head_sha:SHA,incremental_files:delta,pr_files:pr});
test('ORCH incremental only recommends ORCH and core, cumulative PR still needs full applicable gates',()=>{
  const p=assess(['scripts/process/comun-orch-runtime.mjs','scripts/process/comun-orch-discovery.node-test.mjs'],
    ['scripts/process/comun-orch-runtime.mjs','scripts/process/comun-orch-discovery.node-test.mjs',
      'package.json','tests/experience-coherence/participation-paths.spec.ts','docs/comun-orch-v2-operations.md',
      '.github/workflows/comun-quality-performance.yml']);
  assert.equal(p.status,'CLASSIFIED');
  assert.deepEqual(p.fast.checks,['CORE_STATIC','ORCH_V2']);
  assert.deepEqual(p.scope.lanes,['ORCH_V2']);
  assert.deepEqual(p.deferred_until_release,['EXPERIENCE_COHERENCE','QUALITY_PERFORMANCE','SECURITY_RESILIENCE']);
  assert(p.release.checks.includes('COST_02'));
  assert(p.branch_protection_unchanged);
  assert.deepEqual(p.authorized_effects,[]);
  assert.equal(p.writes,0);
});
test('Auth, SQL and migration changes cannot avoid security and schema',()=>{
  for(const path of ['supabase/migrations/2026.sql','scripts/db/permissions.sql','scripts/security/secret.mjs']){
    const p=assess([path]);
    assert(p.scope.lanes.includes('SCHEMA_PREFLIGHT'));
    assert(p.scope.lanes.includes('SECURITY_RESILIENCE'));
    assert(p.scope.lanes.includes('QUALITY_PERFORMANCE'));
  }
  for(const path of ['app/api/internal/auth/route.ts','components/comun-app-shell.tsx','lib/auth/session.ts']){
    const p=assess([path]);assert(p.scope.lanes.includes('SECURITY_RESILIENCE'));
    assert(p.scope.lanes.includes('EXPERIENCE_COHERENCE'));
  }
});
test('docs-only scope never implies merge permissions or release certification',()=>{
  const p=assess(['docs/comun-product-objective-and-roadmap.md']);
  assert.equal(p.status,'CLASSIFIED');assert.deepEqual(p.scope.lanes,[]);
  assert(p.release.checks.includes('COST_02'));assert.equal(p.mode,'ADVISORY_ONLY');
});
test('tests and workflow changes retain corresponding scope',()=>{
  assert.deepEqual(assess(['tests/experience-coherence/participation-paths.spec.ts']).scope.lanes,['EXPERIENCE_COHERENCE']);
  assert.deepEqual(assess(['.github/workflows/comun-quality-performance.yml']).scope.lanes,['QUALITY_PERFORMANCE']);
  assert.deepEqual(assess(['.github/workflows/comun-security-resilience.yml']).scope.lanes,['SECURITY_RESILIENCE']);
});
test('unknown scope cannot silently bypass any gates',()=>{
  const p=assess(['scripts/unknown-guard.mjs']);
  assert.deepEqual(p.scope.lanes,[...CI_IMPACT_LANES]);
  assert.deepEqual(p.scope.unknown_paths,['scripts/unknown-guard.mjs']);
});
test('fail-closed on missing or mismatched diff, stale SHA or traversal',()=>{
  for(const inputs of [
    {head_sha:'bad',incremental_files:['docs/a.md'],pr_files:['docs/a.md']},
    {head_sha:SHA,incremental_files:[],pr_files:['docs/a.md']},
    {head_sha:SHA,incremental_files:['docs/a.md'],pr_files:['docs/b.md']},
    {head_sha:SHA,incremental_files:['app/../docs/a.md'],pr_files:['app/../docs/a.md']},
    {head_sha:SHA,incremental_files:['docs/a.md'],pr_files:['docs/a.md'],pr_complete:false},
    {head_sha:SHA,incremental_files:['docs/a.md'],pr_files:['docs/a.md'],incremental_complete:false},
  ]){
    const p=classifyCiImpact(inputs);
    assert.equal(p.status,'INDETERMINATE');assert.deepEqual(p.release.lanes,[...CI_IMPACT_LANES]);
    assert.equal(p.writes,0);
  }
});
