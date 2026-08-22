import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const runner=fs.readFileSync('scripts/run-48-5-a4-c0-post-activation-readonly.sh','utf8');
const workflow=fs.readFileSync('.github/workflows/comun-48-5-a4-c0-post-activation.yml','utf8');

test('C0 runner is explicitly read-only and has no production writer primitive',()=>{
  assert.match(runner,/begin read only;/i);
  assert.match(runner,/rollback;/i);
  assert.match(runner,/COMUN_48_5_A4_C0_POST_ACTIVATION_BASELINE_GREEN_A4_CLOSED/);
  assert.doesNotMatch(runner,/\bsupabase\s+(?:db\s+push|migration\s+repair|db\s+reset)\b|\bvercel\s+(?:env\s+(?:add|rm|update)|deploy|promote)\b|curl[^\n]*-X\s*(?:POST|PUT|PATCH|DELETE)|\bINSERT\s+INTO\b/i);
});

test('C0 workflow is dispatch-only and only invokes the read-only runner',()=>{
  assert.match(workflow,/workflow_dispatch:/);
  assert.doesNotMatch(workflow,/\n\s*push:/);
  assert.match(workflow,/run-48-5-a4-c0-post-activation-readonly\.sh/);
  assert.doesNotMatch(workflow,/\b(?:deploy|promote|env add|env rm|migration repair|db push)\b/i);
});

test('C0 closes only after canonical production, flags, schema, snapshot, and eight-route smoke checks',()=>{
  for(const stage of ['canonical_state_green','flags_green','schema_baseline_green','snapshot_green','runtime_smoke_green','terminal_green'])assert.match(runner,new RegExp(`stage ${stage}`));
  assert.match(runner,/COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED/);
  assert.match(runner,/a3State/);
  for(const route of ['/comun/acervo','/comun/acervo/contribuir','/comun/acervo/arte','/comun/acervo/arte/contribuir','/comun/acervo/historias-orais','/comun/acervo/historias-orais/contribuir','/comun/radio','/comun/radio/contribuir'])assert.match(runner,new RegExp(route.replaceAll('/','\\/')));
});
