/** COMUN ORCH-V2: pure fail-closed decisions. No Git, network, locks or side effects. */
import { createHash } from 'node:crypto';

export const ORCH_FORMAT = 'COMUN_ORCH_V2';
export const STATES = Object.freeze([
  'READY', 'RUNNING', 'WAIT_CI', 'WAIT_EXTERNAL', 'WAIT_HUMAN',
  'RETRY_BACKOFF', 'BLOCKED_PROTECTED', 'DONE',
]);
const STATES_SET = new Set(STATES);
const PROTECTED_ACTIONS = new Set([
  'PRODUCTION_DEPLOY', 'REMOTE_MIGRATION', 'SCHEMA_WRITE',
  'FLAG_CHANGE', 'SECRET_ACCESS', 'PAID_RESOURCE', 'FORCE_PUSH',
  'RESTRICTED_MERGE', 'EXTERNAL_MESSAGE', 'DELETE_FOREIGN_LOCK',
]);
const SAFE_DIFF_PREFIXES = ['docs/', 'reports/', 'tests/', 'e2e/', '.github/workflows/'];
const SAFE_TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:ts|tsx|mjs|js)$/;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  }
  return value;
}
export function fingerprint(inputs) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw new Error('INPUTS_REQUIRED');
  }
  return createHash('sha256').update(JSON.stringify(stable(inputs))).digest('hex');
}
function timeMs(now) {
  const ms = typeof now === 'number' ? now : Date.parse(now);
  if (!Number.isFinite(ms)) throw new Error('VALID_TIME_REQUIRED');
  return ms;
}
function requireTask(task) {
  if (!task || typeof task.taskId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/.test(task.taskId)) {
    throw new Error('VALID_TASK_ID_REQUIRED');
  }
  if (!STATES_SET.has(task.status)) throw new Error('INVALID_TASK_STATUS');
}
function copyTask(task) { return {...task, dependencies: [...(task.dependencies || [])]}; }

/** Launcher alone validates the lock ownership and commits checkpoint via CAS. */
export function planCycle({tasks, now, lock, checkpointValid = true}) {
  const ms = timeMs(now);
  if (!checkpointValid) return {kind:'PROTECTED_NOOP', reason:'checkpoint-unverified'};
  if (!Array.isArray(tasks)) throw new Error('TASKS_REQUIRED');
  const ids = new Set(), map = new Map();
  for (const task of tasks) {
    requireTask(task);
    if (ids.has(task.taskId)) throw new Error('DUPLICATE_TASK_ID');
    ids.add(task.taskId); map.set(task.taskId, task);
  }
  if (!lock || lock.status !== 'OWNED' || !lock.ownerId || lock.verified !== true) {
    return {kind:'PROTECTED_NOOP', reason:lock?.status === 'LIVE_OTHER' ? 'another-owner' : 'lock-ownership-unverified'};
  }
  const ready = tasks.filter(t => t.status === 'READY' &&
    !PROTECTED_ACTIONS.has(t.action) && t.authorized === true &&
    (t.dependencies || []).every(id => map.get(id)?.status === 'DONE'));
  ready.sort((a,b) => (b.priority ?? 0)-(a.priority ?? 0) || a.taskId.localeCompare(b.taskId));
  if (ready.length) return {kind:'EXECUTE_ONE', taskId:ready[0].taskId, ownerId:lock.ownerId};
  const probes = tasks.filter(t => ['WAIT_CI','WAIT_EXTERNAL','RETRY_BACKOFF'].includes(t.status) &&
    t.nextProbeAt != null && timeMs(t.nextProbeAt) <= ms &&
    !(t.status === 'RETRY_BACKOFF' && (t.attemptsForFingerprint || 0) >= 2));
  probes.sort((a,b) => timeMs(a.nextProbeAt)-timeMs(b.nextProbeAt) || a.taskId.localeCompare(b.taskId));
  if (probes.length) return {kind:'PROBE_ONE', taskId:probes[0].taskId, ownerId:lock.ownerId};
  return {kind:'QUIET_NOOP', reason:'no-eligible-work-or-probe'};
}

/** Two equivalent failures exhaust retries; attemptId prevents duplicate increments. */
export function recordFailure(task, {failureFingerprint, attemptId, now, transient = true}) {
  requireTask(task);
  if (typeof failureFingerprint !== 'string' || !failureFingerprint || !attemptId) throw new Error('FAILURE_EVIDENCE_REQUIRED');
  const ms = timeMs(now);
  if (task.lastAttemptId === attemptId) return {changed:false, task};
  const same = task.failureFingerprint === failureFingerprint;
  const attempts = same ? Math.min((task.attemptsForFingerprint || 0)+1, 2) : 1;
  const status = !transient ? 'BLOCKED_PROTECTED' : attempts >= 2 ? 'WAIT_EXTERNAL' : 'RETRY_BACKOFF';
  const nextProbeAt = status === 'RETRY_BACKOFF' ? new Date(ms + 10*60*1000).toISOString() : null;
  const next = {...copyTask(task), status, failureFingerprint, attemptsForFingerprint: attempts,
    lastAttemptId: attemptId, nextProbeAt};
  return {changed:true, task:next};
}

/** Changing inputs resets budget but never bypasses human/protected gates. */
export function observeInputs(task, {inputFingerprint, now, eligible = false}) {
  requireTask(task); timeMs(now);
  if (!inputFingerprint || typeof inputFingerprint !== 'string') throw new Error('INPUT_FINGERPRINT_REQUIRED');
  if (task.inputFingerprint === inputFingerprint) return {changed:false, task};
  const next = {...copyTask(task), inputFingerprint, attemptsForFingerprint:0,
    failureFingerprint:null, lastAttemptId:null, nextProbeAt:null,
    status: eligible && task.status !== 'BLOCKED_PROTECTED' && task.status !== 'WAIT_HUMAN' ? 'READY' : task.status};
  return {changed:true, task:next};
}
export function notificationDecision(task, blockerFingerprint) {
  requireTask(task);
  if (task.status !== 'WAIT_HUMAN' && task.status !== 'BLOCKED_PROTECTED') return {kind:'NONE'};
  if (!blockerFingerprint || typeof blockerFingerprint !== 'string') throw new Error('BLOCKER_FINGERPRINT_REQUIRED');
  return task.lastNotifiedFingerprint === blockerFingerprint ? {kind:'NONE'} :
    {kind:'NOTIFY_ONCE', taskId:task.taskId, blockerFingerprint};
}
function isBuildSafePath(path) {
  if (typeof path !== 'string' || !path || path.includes('..') || path.startsWith('/')) return false;
  return SAFE_DIFF_PREFIXES.some(prefix => path.startsWith(prefix)) ||
    SAFE_TEST_FILE.test(path) || ['README.md','CHANGELOG.md','CONTRIBUTING.md'].includes(path);
}
function matchesPreview(dep, sha, projectId, branch) {
  return dep?.sha === sha && dep?.projectId === projectId && dep?.branch === branch &&
    dep?.source === 'git' && dep?.environment === 'preview';
}
/** COST_PASS != READY; ignored != failed; ancestor equivalent != exact. */
export function classifyPreview({headSha, projectId, branch, cost02, exact, ancestor, diff, exactRequired = true}) {
  if (![headSha,projectId,branch].every(x => typeof x === 'string' && x.length>0))
    return {status:'UNVERIFIED', reason:'identity-missing'};
  if (cost02 !== 'SUCCESS') return {status:'COST_UNPROVEN', reason:'cost02-not-passed'};
  if (matchesPreview(exact, headSha, projectId, branch) && exact.state === 'READY')
    return {status:'DEPLOY_READY_EXACT', satisfied:true};
  if (!matchesPreview(exact, headSha, projectId, branch))
    return {status:'UNVERIFIED', reason:'exact-deployment-identity-mismatch'};
  if (exact.state === 'ERROR' || exact.state === 'BLOCKED')
    return {status:'DEPLOY_FAILED', reason:'deployment-error'};
  if (exact.state !== 'CANCELED' || exact.ignoreReason !== 'no-runtime-allowlist')
    return {status:'UNVERIFIED', reason:'not-proven-intentional-ignore'};
  if (!ancestor || !diff || diff.complete !== true || diff.ancestorSha !== ancestor.sha ||
      diff.headSha !== headSha || diff.isAncestor !== true ||
      !matchesPreview(ancestor, ancestor.sha, projectId, branch) || ancestor.state !== 'READY' ||
      ancestor.sha === headSha || !Array.isArray(diff.files) || !diff.files.length ||
      !diff.files.every(isBuildSafePath)) {
    return {status:'DEPLOY_INTENTIONALLY_IGNORED', satisfied:false, reason:'equivalence-not-proven'};
  }
  return {status:'EQUIVALENT_RUNTIME_PREVIEW_PROVEN', satisfied:!exactRequired,
    reason: exactRequired ? 'exact-preview-required' : 'ancestor-equivalence-permitted',
    ancestorSha:ancestor.sha};
}
/** Uncertain external side effect -> inspect authoritative outcome, never retry blindly. */
export function reconcileExternalOutcome({operationKind, outcome, verifiedRemoteResult, idempotencyKey}) {
  if (typeof idempotencyKey !== 'string' || !idempotencyKey) return {kind:'BLOCK',reason:'idempotency-key-missing'};
  if (PROTECTED_ACTIONS.has(operationKind)) return {kind:'BLOCK',reason:'protected-operation'};
  if (outcome === 'UNKNOWN' || outcome === 'TIMEOUT') {
    return verifiedRemoteResult === 'COMPLETED' ? {kind:'ALREADY_DONE'} :
      {kind:'WAIT_HUMAN',reason:'outcome-uncertain-no-blind-retry'};
  }
  return outcome === 'COMPLETED' && verifiedRemoteResult === 'COMPLETED' ? {kind:'ALREADY_DONE'} :
    {kind:'BLOCK',reason:'not-verified'};
}
