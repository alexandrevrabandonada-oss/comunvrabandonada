import crypto from "node:crypto";
import fs from "node:fs";

export const A4_FLAG_WRITER_ID = "comun-48-5-a4-r2";
export const A4_FLAG_KEY = "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED";
export const A3_FLAG_KEY = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";

export function fingerprint(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function rows(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.envs) ? payload.envs : Array.isArray(payload?.data) ? payload.data : [];
}

function valueState(value) {
  if (value === "enabled") return "ON";
  if (value === "disabled") return "OFF";
  if (value === undefined || value === "") return "ABSENT";
  return "UNKNOWN";
}

function parseEnv(file) {
  const values = new Map();
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replaceAll('\\"', '"');
    values.set(match[1], value);
  }
  return values;
}

function metadata(row) {
  return {
    id: fingerprint(row?.id),
    target: Array.isArray(row?.target) ? row.target : [],
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    gitBranch: row?.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(row?.customEnvironmentIds) ? row.customEnvironmentIds.map(fingerprint) : [],
    managedByA4Writer: typeof row?.comment === 'string' && row.comment.includes(`managed-by=${A4_FLAG_WRITER_ID}`),
    sourceType: "project",
  };
}

function keyRows(projectRows, key) {
  return projectRows.filter((row) => row?.key === key);
}

function productionRows(projectRows, key) {
  return keyRows(projectRows, key).filter((row) => Array.isArray(row?.target) && row.target.includes("production"));
}

function assertNoOverrides(row, key) {
  if (row.gitBranch !== null && row.gitBranch !== undefined) throw new Error(`${key}_PRODUCTION_BRANCH_OVERRIDE`);
  if (Array.isArray(row.customEnvironmentIds) && row.customEnvironmentIds.length > 0) throw new Error(`${key}_PRODUCTION_CUSTOM_ENV_OVERRIDE`);
}

function assertProductionOnly(row, key) {
  if (!Array.isArray(row.target) || row.target.length !== 1 || row.target[0] !== 'production') throw new Error(`${key}_PRODUCTION_TARGET_NOT_EXACT`);
}

export function assertA4Transition({ mode, currentState, desiredState }) {
  const current = String(currentState ?? "").toUpperCase();
  const desired = String(desiredState ?? "").toLowerCase();
  if (!['ON', 'OFF', 'ABSENT'].includes(current)) throw new Error('A4_FLAG_CURRENT_STATE_UNKNOWN');
  if (mode === 'bootstrap' && current === 'ABSENT' && desired === 'disabled') return { current, desired, allowed: true };
  if (mode === 'wave1-only' && current === 'OFF' && desired === 'enabled') return { current, desired, allowed: true };
  if (mode === 'disable-only' && desired === 'disabled' && ['ON', 'OFF'].includes(current)) return { current, desired, allowed: true };
  throw new Error(`A4_FLAG_TRANSITION_BLOCKED:${mode}:${current}:${desired}`);
}

export function assertA4BootstrapPreconditions({ projectRows, sharedRows, env }) {
  const a4All = keyRows(projectRows, A4_FLAG_KEY);
  const a4Production = productionRows(projectRows, A4_FLAG_KEY);
  const a4Shared = keyRows(sharedRows, A4_FLAG_KEY);
  if (a4All.length !== 0 || a4Production.length !== 0) throw new Error('A4_FLAG_BOOTSTRAP_KEY_ALREADY_PRESENT');
  if (a4Shared.length !== 0) throw new Error('A4_FLAG_SHARED_ENV_CONFLICT');
  if (valueState(env.get(A4_FLAG_KEY)) !== 'ABSENT') throw new Error('A4_FLAG_BOOTSTRAP_EFFECTIVE_VALUE_NOT_ABSENT');

  const a3Production = productionRows(projectRows, A3_FLAG_KEY);
  const a3Shared = keyRows(sharedRows, A3_FLAG_KEY);
  if (a3Production.length !== 1) throw new Error('A3_FLAG_PRODUCTION_ENV_NOT_UNIQUE');
  if (a3Shared.length !== 0) throw new Error('A3_FLAG_SHARED_ENV_CONFLICT');
  assertProductionOnly(a3Production[0], A3_FLAG_KEY);
  assertNoOverrides(a3Production[0], A3_FLAG_KEY);
  if (valueState(env.get(A3_FLAG_KEY)) !== 'ON') throw new Error('A3_FLAG_EXPECTED_ON');
  assertA4Transition({ mode: 'bootstrap', currentState: 'ABSENT', desiredState: 'disabled' });
  return {
    a4: { state: 'ABSENT', projectMatches: 0, productionMatches: 0, sharedMatches: 0 },
    a3: { state: 'ON', production: metadata(a3Production[0]), sharedMatches: 0 },
  };
}

export function assertA4BootstrapPostconditions({ projectRows, sharedRows, env }) {
  const a4All = keyRows(projectRows, A4_FLAG_KEY);
  const a4Production = productionRows(projectRows, A4_FLAG_KEY);
  const a4Shared = keyRows(sharedRows, A4_FLAG_KEY);
  if (a4All.length !== 1 || a4Production.length !== 1) throw new Error('A4_FLAG_BOOTSTRAP_PROJECT_ENV_NOT_UNIQUE');
  if (a4Shared.length !== 0) throw new Error('A4_FLAG_SHARED_ENV_CONFLICT');
  assertProductionOnly(a4Production[0], A4_FLAG_KEY);
  assertNoOverrides(a4Production[0], A4_FLAG_KEY);
  if (typeof a4Production[0].comment !== 'string' || !a4Production[0].comment.includes(`managed-by=${A4_FLAG_WRITER_ID}`)) throw new Error('A4_FLAG_BOOTSTRAP_WRITER_PROVENANCE_MISSING');
  if (valueState(env.get(A4_FLAG_KEY)) !== 'OFF') throw new Error('A4_FLAG_BOOTSTRAP_EFFECTIVE_VALUE_NOT_OFF');

  const a3Production = productionRows(projectRows, A3_FLAG_KEY);
  const a3Shared = keyRows(sharedRows, A3_FLAG_KEY);
  if (a3Production.length !== 1 || a3Shared.length !== 0) throw new Error('A3_FLAG_OWNERSHIP_CHANGED');
  assertProductionOnly(a3Production[0], A3_FLAG_KEY);
  assertNoOverrides(a3Production[0], A3_FLAG_KEY);
  if (valueState(env.get(A3_FLAG_KEY)) !== 'ON') throw new Error('A3_FLAG_NOT_PRESERVED_ON');
  return { a4: metadata(a4Production[0]), a3: metadata(a3Production[0]) };
}

export function createA4Receipt({ phase, runId, sha, projectId, before, after }) {
  return {
    formatVersion: 1,
    writer: A4_FLAG_WRITER_ID,
    key: A4_FLAG_KEY,
    phase,
    runId: /^[0-9]+$/.test(String(runId ?? '')) ? String(runId) : null,
    mainSha: /^[0-9a-f]{7,64}$/i.test(String(sha ?? '')) ? String(sha) : null,
    projectFingerprint: fingerprint(projectId),
    environment: 'production',
    previousState: before?.a4?.state ?? null,
    desiredState: after ? 'disabled' : 'disabled',
    projectMatches: before?.a4?.projectMatches ?? (after ? 1 : null),
    sharedMatches: before?.a4?.sharedMatches ?? 0,
    envId: after?.a4?.id ?? null,
    writerProvenance: after?.a4?.managedByA4Writer ?? false,
    a3State: before?.a3?.state ?? 'ON',
    rawValuePersisted: false,
    tokenPersisted: false,
  };
}

export function observeA4FlagState({ projectRows, sharedRows, env }) {
  const observe = (key) => ({
    key,
    valueState: valueState(env.get(key)),
    projectMatches: keyRows(projectRows, key).map(metadata),
    productionMatches: productionRows(projectRows, key).map(metadata),
    sharedMatches: keyRows(sharedRows, key).length,
  });
  return { formatVersion: 1, phase: 'read-only-observed-state', a4: observe(A4_FLAG_KEY), a3: observe(A3_FLAG_KEY), rawValuePersisted: false, tokenPersisted: false };
}

export function sanitizeA4CreateResponse(payload) {
  const matches = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value.key === A4_FLAG_KEY && typeof value.id === 'string' && value.id.length > 0) matches.push(value);
    Object.values(value).forEach(visit);
  };
  visit(payload);
  if (matches.length !== 1) throw new Error('A4_FLAG_CREATE_RESPONSE_ID_NOT_UNIQUE');
  return { envId: fingerprint(matches[0].id), rawValuePersisted: false, tokenPersisted: false };
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

if (process.argv[1]?.endsWith('a4-flag-writer-contract.mjs')) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const projectRows = rows(readJson(args.get('--project-json')));
  const sharedRows = rows(readJson(args.get('--shared-json')));
  const env = parseEnv(args.get('--env-file'));
  const phase = args.get('--phase');
  const outcome = phase === 'bootstrap-pre'
    ? assertA4BootstrapPreconditions({ projectRows, sharedRows, env })
    : phase === 'bootstrap-post'
      ? assertA4BootstrapPostconditions({ projectRows, sharedRows, env })
      : phase === 'audit'
        ? observeA4FlagState({ projectRows, sharedRows, env })
        : (() => { throw new Error('A4_FLAG_RECEIPT_PHASE_INVALID'); })();
  if (phase === 'audit') {
    fs.writeFileSync(args.get('--output'), `${JSON.stringify(outcome, null, 2)}\n`, 'utf8');
    console.log(`A4_FLAG_READ_ONLY_AUDIT a4=${outcome.a4.valueState} a3=${outcome.a3.valueState} a4ProductionMatches=${outcome.a4.productionMatches.length} a4SharedMatches=${outcome.a4.sharedMatches}`);
    process.exit(0);
  }
  const receipt = createA4Receipt({
    phase,
    runId: process.env.GITHUB_RUN_ID,
    sha: process.env.EXPECTED_MAIN_SHA,
    projectId: process.env.VERCEL_PROJECT_ID,
    before: phase === 'bootstrap-pre' ? outcome : undefined,
    after: phase === 'bootstrap-post' ? outcome : undefined,
  });
  fs.writeFileSync(args.get('--output'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  console.log(`A4_FLAG_WRITER_CONTRACT_GREEN phase=${phase} a4=${phase === 'bootstrap-pre' ? 'ABSENT' : 'OFF'} a3=ON`);
}
