import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateHardeningLedger, withHeldFiles, assertEmptyPlan } from './readonly-reconciled-migration-plan.mjs';
const manifest = JSON.parse(readFileSync('supabase/releases/20260922120000-canonical-security-hardening-v2.json', 'utf8'));
const row = { release: manifest.release, migration_path: manifest.migration,
  migration_sha256: manifest.migrationSha256, pre_fingerprint: manifest.expectedPreFingerprint,
  post_fingerprint: manifest.expectedPostFingerprint, status: 'applied' };

test('only the unique byte-pinned accepted Hardening ledger allows reconciliation', () => {
  validateHardeningLedger(manifest, [row]);
  for (const rows of [[], [row, row]]) assert.throws(() => validateHardeningLedger(manifest, rows));
  for (const key of Object.keys(row)) assert.throws(() => validateHardeningLedger(manifest, [{...row, [key]: 'drift'}]));
  assert.throws(() => validateHardeningLedger({...manifest, migrationSha256: 'drift'}, [row]));
});

test('temporary files are restored after success, planner failure and partial move', () => {
  const dir = mkdtempSync(join(tmpdir(), 'comun-plan-test-'));
  const a = join(dir, 'a.sql'), b = join(dir, 'b.sql');
  writeFileSync(a, 'a'); writeFileSync(b, 'b');
  try {
    withHeldFiles([a, b], () => { assert.equal(existsSync(a), false); assert.equal(existsSync(b), false); });
    assert.throws(() => withHeldFiles([a, b], () => { throw new Error('planner failed'); }));
    assert.throws(() => withHeldFiles([a, join(dir, 'missing')], () => assert.fail()));
    assert.equal(readFileSync(a, 'utf8'), 'a'); assert.equal(readFileSync(b, 'utf8'), 'b');
  } finally { rmSync(dir, {recursive: true}); }
});

test('unknown pending migrations and unsuccessful or empty output fail closed', () => {
  assertEmptyPlan('Remote database is up to date.\n');
  for (const plan of ['', 'Connecting to remote database...', 'Remote database is up to date.\n20990101000000_unknown.sql', '--include-all', 'migration repair', 'db reset', 'seed'])
    assert.throws(() => assertEmptyPlan(plan));
});

test('blocked plan diagnostics contain only pending filenames, never connection data', () => {
  assert.throws(() => assertEmptyPlan('postgresql://private:secret@example.invalid/test\n20990101000000_unknown.sql'),
    { message: 'REMOTE_MIGRATION_PLAN_NOT_EMPTY:20990101000000_unknown.sql' });
});
