import assert from 'node:assert/strict';
import test from 'node:test';

import {
  A4_FLAG_WRITER_ID,
  assertA4BootstrapPostconditions,
  assertA4BootstrapPreconditions,
  assertA4Transition,
  createA4Receipt,
  sanitizeA4CreateResponse,
} from './a4-flag-writer-contract.mjs';

const A4 = 'COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED';
const A3 = 'COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED';

function fixture({ a4 = 'absent', a3 = 'enabled', shared = false, duplicate = false, override = false } = {}) {
  const projectRows = [{ id: 'a3-id', key: A3, target: ['production'], gitBranch: null, customEnvironmentIds: [] }];
  if (a4 !== 'absent') projectRows.push({ id: 'a4-id', key: A4, target: ['production'], gitBranch: override ? 'feature/x' : null, customEnvironmentIds: [] });
  if (duplicate) projectRows.push({ id: 'a4-id-two', key: A4, target: ['production'], gitBranch: null, customEnvironmentIds: [] });
  const env = new Map([[A3, a3]]);
  if (a4 !== 'absent') env.set(A4, a4);
  return { projectRows, sharedRows: shared ? [{ id: 'shared', key: A4, target: ['production'] }] : [], env };
}

test('A4 writer allows only explicit ownership transitions', () => {
  assert.equal(assertA4Transition({ mode: 'bootstrap', currentState: 'ABSENT', desiredState: 'disabled' }).allowed, true);
  assert.equal(assertA4Transition({ mode: 'wave1-only', currentState: 'OFF', desiredState: 'enabled' }).allowed, true);
  assert.equal(assertA4Transition({ mode: 'disable-only', currentState: 'ON', desiredState: 'disabled' }).allowed, true);
  assert.equal(assertA4Transition({ mode: 'disable-only', currentState: 'OFF', desiredState: 'disabled' }).allowed, true);
  assert.throws(() => assertA4Transition({ mode: 'bootstrap', currentState: 'OFF', desiredState: 'disabled' }), /TRANSITION_BLOCKED/);
  assert.throws(() => assertA4Transition({ mode: 'wave1-only', currentState: 'ABSENT', desiredState: 'enabled' }), /TRANSITION_BLOCKED/);
});

test('bootstrap accepts only total A4 absence and preserves A3 ON', () => {
  const before = assertA4BootstrapPreconditions(fixture());
  assert.equal(before.a4.state, 'ABSENT');
  assert.equal(before.a3.state, 'ON');
  assert.throws(() => assertA4BootstrapPreconditions(fixture({ a4: 'disabled' })), /ALREADY_PRESENT/);
  assert.throws(() => assertA4BootstrapPreconditions(fixture({ shared: true })), /SHARED/);
  assert.throws(() => assertA4BootstrapPreconditions(fixture({ a3: 'disabled' })), /A3_FLAG_EXPECTED_ON/);
});

test('bootstrap postflight requires one ordinary Production row and effective OFF', () => {
  const complete = fixture({ a4: 'disabled' });
  assert.match(assertA4BootstrapPostconditions(complete).a4.id, /^sha256:/);
  assert.throws(() => assertA4BootstrapPostconditions(fixture({ a4: 'disabled', duplicate: true })), /NOT_UNIQUE/);
  assert.throws(() => assertA4BootstrapPostconditions(fixture({ a4: 'disabled', override: true })), /BRANCH_OVERRIDE/);
  assert.throws(() => assertA4BootstrapPostconditions(fixture({ a4: 'enabled' })), /NOT_OFF/);
});

test('receipts are sanitized and identify the dedicated A4 writer', () => {
  const receipt = createA4Receipt({ phase: 'bootstrap-pre', runId: '123', sha: 'a'.repeat(40), projectId: 'project-id', before: assertA4BootstrapPreconditions(fixture()) });
  assert.equal(receipt.writer, A4_FLAG_WRITER_ID);
  assert.match(receipt.projectFingerprint, /^sha256:[0-9a-f]{16}$/);
  assert.equal(receipt.rawValuePersisted, false);
  assert.equal(receipt.tokenPersisted, false);
  assert.doesNotMatch(JSON.stringify(receipt), /project-id/);
  assert.match(JSON.stringify(receipt), /"desiredState":"disabled"/);
});

test('creation response retains only the returned environment ID fingerprint', () => {
  const sanitized = sanitizeA4CreateResponse({ created: [{ id: 'a4-created-id', key: A4, value: 'disabled' }] });
  assert.match(sanitized.envId, /^sha256:[0-9a-f]{16}$/);
  assert.doesNotMatch(JSON.stringify(sanitized), /a4-created-id|disabled/);
  assert.throws(() => sanitizeA4CreateResponse({ created: [] }), /NOT_UNIQUE/);
});
