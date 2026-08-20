import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const workflow = fs.readFileSync('.github/workflows/comun-48-5-a4-r2-d0-flag-bootstrap.yml', 'utf8');
const runner = fs.readFileSync('scripts/run-48-5-a4-flag-bootstrap.sh', 'utf8');
const contract = fs.readFileSync('scripts/ci/a4-flag-writer-contract.mjs', 'utf8');

test('D0 is dispatch-only, serializes with A4 Wave 0, and requires exact main', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /options: \[bootstrap, verify-only\]/);
  assert.match(workflow, /group: comun-48-5-a4-r2-production/);
  assert.match(workflow, /ref: \$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(runner, /git rev-parse refs\/remotes\/origin\/main/);
  assert.match(runner, /CONCURRENT_WRITER/);
});

test('D0 can create only the exact project Production A4 flag and no second key', () => {
  assert.match(runner, /COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED/);
  assert.match(runner, /value: 'disabled'/);
  assert.match(runner, /target: \['production'\]/);
  assert.match(runner, /api\.vercel\.com\/v10\/projects\/\$VERCEL_PROJECT_ID\/env/);
  assert.match(contract, /A4_FLAG_BOOTSTRAP_KEY_ALREADY_PRESENT/);
  assert.match(contract, /A4_FLAG_SHARED_ENV_CONFLICT/);
  assert.doesNotMatch(runner, /env add .*--force/);
  assert.doesNotMatch(runner, /COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED.*(PATCH|POST)/s);
});

test('D0 never applies schema or makes a product request', () => {
  assert.doesNotMatch(runner, /supabase db push|supabase migration|apply_a4|db reset/);
  assert.doesNotMatch(runner, /curl[^\n]*-X POST[^\n]*comunsocial\.online/);
  assert.match(runner, /begin read only;/);
  assert.match(runner, /smokeMethods=GET_HEAD_ONLY/);
  assert.match(runner, /migrationA4=pending/);
  assert.match(runner, /businessWrites=0/);
});

test('D0 emits sanitized before and after receipts and stops before Wave 0', () => {
  assert.match(runner, /a4-flag-bootstrap-pre-receipt\.json/);
  assert.match(runner, /a4-flag-create-response-receipt\.json/);
  assert.match(runner, /a4-flag-runtime-post-receipt\.json/);
  assert.match(runner, /a4-flag-recovery-pre-receipt\.json/);
  assert.match(contract, /rawValuePersisted: false/);
  assert.match(contract, /tokenPersisted: false/);
  assert.match(runner, /COMUN_48_5_A4_R2_FLAG_BOOTSTRAP_GREEN_EXPLICIT_OFF_READY_FOR_WAVE0/);
  assert.doesNotMatch(runner, /20260819130000.*push|wave1-only|set_a4_flag enabled/);
});
