import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const runner=fs.readFileSync('scripts/run-48-5-a4-wave1-production.sh','utf8');
const workflow=fs.readFileSync('.github/workflows/comun-48-5-a4-r2-wave1.yml','utf8');
test('Wave 1 has only activation and disable-only modes',()=>{assert.match(runner,/wave1-only\|disable-only/);assert.doesNotMatch(runner,/db push|migration list|--include-all|db reset/);assert.match(workflow,/comun-48-5-a4-r2-production/);});
test('workflow dispatch exposes a string mode that the runner validates',()=>{assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/mode:\s*\n\s*description: Runtime-only mode[\s\S]*type: string/);assert.doesNotMatch(workflow,/\n\s*push:/);});
test('writer patch is ID-specific and minimal',()=>{assert.match(runner,/\/v9\/projects\/\$VERCEL_PROJECT_ID\/env\/\$id/);assert.match(runner,/--data "\{\\"value\\":\\"\$value\\"\}"/);assert.doesNotMatch(runner,/env add|--force|POST/);});
test('post-write state machine rolls back only A4 on every terminal boundary',()=>{
  for(const boundary of ['flag_post_failed','flag_identity_failed','deployment_failed','smoke_failed','snapshot_failed','comparison_failed']) assert.match(runner,new RegExp(`fail_after_enable ${boundary}`));
  assert.match(runner,/trap - ERR EXIT/);assert.match(runner,/write_rollback_receipt started/);assert.match(runner,/patch_a4 disabled/);assert.match(runner,/ROLLBACK_INCOMPLETE_REQUIRES_INTERVENTION/);
});
test('identity proof preserves A4 and A3 and rollback smoke expects A4 off',()=>{assert.match(runner,/\['id','type','target','createdAt'\],'A4'/);assert.match(runner,/\['id','type','target','createdAt','updatedAt'\],'A3'/);assert.match(runner,/smoke disabled/);assert.match(runner,/smoke enabled/);});
test('runtime proof is GET/HEAD only and records each marker without retaining HTML',()=>{assert.match(runner,/specialized=photo&intake=wave1-smoke/);for(const marker of ['Como este material chegou até você?','Relação com a autoria','De quem é a voz?','Música incorporada possui análise própria'])assert.match(runner,new RegExp(marker));assert.match(runner,/runtime-smoke\.json/);assert.match(runner,/failedSurface/);assert.match(runner,/failedMarker/);assert.match(runner,/bodySha256/);assert.doesNotMatch(runner,/\bcurl .* -X (POST|PUT)/);});
test('rollback receipts are created before the disable mutation and remain sanitized',()=>{assert.match(runner,/write_rollback_receipt started[\s\S]*disable_a4/);assert.match(runner,/previousObservedState:'ON'/);assert.match(runner,/rawValuePersisted:false/);assert.match(runner,/tokenPersisted:false/);});
test('read-only business snapshot uses canonical radio publication status',()=>{assert.match(runner,/comun_radio_programs where publication_status='published'/);assert.match(runner,/comun_radio_episodes where publication_status='published'/);assert.doesNotMatch(runner,/comun_radio_(?:programs|episodes) where status='published'/);});
