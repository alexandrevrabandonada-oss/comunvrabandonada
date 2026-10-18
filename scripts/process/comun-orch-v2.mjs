import { createHash } from "node:crypto";
import {decide,cycleBackstop,probeBackstop,externalProof} from './comun-orch-adapter.mjs';

export const STATES = Object.freeze([
  "READY",
  "RUNNING",
  "WAIT_CI",
  "WAIT_EXTERNAL",
  "WAIT_HUMAN",
  "RETRY_BACKOFF",
  "BLOCKED_PROTECTED",
  "DONE",
]);
export const PROTECTED = Object.freeze([
  "merge",
  "production",
  "migration",
  "permissions",
  "flags",
  "indexation",
  "secrets",
  "email",
  "backup",
  "permit",
  "spend",
]);
export const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : stable(value))
    .digest("hex");
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const iso = (ms) => new Date(ms).toISOString();
const copy = (v) => structuredClone(v);

export function task({
  task_id,
  priority,
  inputs,
  status = "READY",
  dependencies = [],
  ...rest
}) {
  return {
    task_id,
    priority,
    status,
    dependencies,
    inputs,
    input_fingerprint: hash(inputs),
    failure_fingerprint: null,
    attempts_for_fingerprint: 0,
    next_probe_at: null,
    owner_id: null,
    last_material_change: null,
    human_action_required: null,
    last_notified_fingerprint: null,
    evidence_sha: null,
    evidence: [],
    operations: [],
    pr_effect:'NONE',
    ...rest,
  };
}

// V1 stays byte-independent and semantically intact: removing only the new field reverses migration.
export function migrateV1(checkpoint, tasks) {
  if (checkpoint.orchV2) return copy(checkpoint);
  return {
    ...copy(checkpoint),
    orchV2: { schema_version: 2, revision: 0, tasks: copy(tasks) },
  };
}
export function exportV1(checkpoint) {
  const result = copy(checkpoint);
  delete result.orchV2;
  return result;
}
export function needsProof(t, scope) {
  return !t.evidence.some(
    (e) =>
      e.result === "PASS" &&
      e.sha === t.inputs.sha &&
      e.input_fingerprint === t.input_fingerprint &&
      e.scope === scope,
  );
}

export function validate(state) {
  if (
    state.schema_version !== 2 ||
    !Number.isInteger(state.revision) ||
    !Array.isArray(state.tasks)
  )
    throw Error("INVALID_STATE");
  const ids = new Set();
  for (const t of state.tasks) {
    if (
      !/^[a-z0-9-]+$/.test(t.task_id) ||
      ids.has(t.task_id) ||
      !STATES.includes(t.status) ||
      !Number.isFinite(t.priority) ||
      !Array.isArray(t.dependencies)
    )
      throw Error("INVALID_TASK");
    ids.add(t.task_id);
    if (
      hash(t.inputs) !== t.input_fingerprint ||
      !Number.isInteger(t.attempts_for_fingerprint) ||
      t.attempts_for_fingerprint < 0
    )
      throw Error("INVALID_FINGERPRINT");
    if (
      t.status === "DONE" &&
      (t.evidence_sha !== t.inputs.sha ||
        !t.evidence.some(
          (e) =>
            e.result === "PASS" &&
            e.sha === t.inputs.sha &&
            e.input_fingerprint === t.input_fingerprint,
        ))
    )
      throw Error("UNPROVEN_DONE");
    if (t.status === "RUNNING" && !t.owner_id)
      throw Error("RUNNING_WITHOUT_OWNER");
    if(t.status==='DONE' && t.proof_contract==='COST_AND_EXACT_PREVIEW_V1' &&
      (t.contract_results?.sha!==t.inputs.sha || t.contract_results?.cost02!=='SUCCESS' ||
       t.contract_results?.preview?.status!=='DEPLOY_READY_EXACT'))throw Error('UNPROVEN_PUBLICATION_DONE');
    if (t.next_probe_at && !Number.isFinite(Date.parse(t.next_probe_at)))
      throw Error("INVALID_PROBE_TIME");
  }
  for (const t of state.tasks)
    for (const id of t.dependencies)
      if (!ids.has(id) || id === t.task_id) throw Error("INVALID_DEPENDENCY");
  const visit = (id, stack = []) => {
    if (stack.includes(id)) throw Error("DEPENDENCY_CYCLE");
    for (const d of state.tasks.find((t) => t.task_id === id).dependencies)
      visit(d, [...stack, id]);
  };
  for (const id of ids) visit(id);
  return state;
}

export function plan(
  state,
  { now, lock = "FREE", owner_id = null, material_budget = 1 } = {},
) {
  validate(state);
  if (!Number.isFinite(now)) throw Error("CLOCK_REQUIRED");
  if (lock !== "FREE" && lock !== "OWNED")
    return {
      action: "NOOP",
      reason: lock,
      selected: null,
      probes: [],
      notifications: [],
      writes: false,
    };
  const running = state.tasks.find((t) => t.status === "RUNNING");
  if (running)
    return {
      action: "RECONCILE",
      selected: running.task_id,
      probes: [],
      notifications: [],
      writes: false,
      reason:
        running.owner_id === owner_id && lock === "OWNED"
          ? "OWN_LEASE_RESUME"
          : "INTERRUPTED_OWNER_REQUIRES_PROOF",
    };
  const notifications = state.tasks
    .filter(
      (t) =>
        ["WAIT_HUMAN", "BLOCKED_PROTECTED"].includes(t.status) &&
        t.human_action_required &&
        t.last_notified_fingerprint !==
          hash([
            t.input_fingerprint,
            t.failure_fingerprint,
            t.human_action_required,
          ]),
    )
    .map((t) => ({
      task_id: t.task_id,
      fingerprint: hash([
        t.input_fingerprint,
        t.failure_fingerprint,
        t.human_action_required,
      ]),
      action: t.human_action_required,
    }));
  const probes = state.tasks
    .filter(
      (t) =>
        ["WAIT_CI", "WAIT_EXTERNAL", "RETRY_BACKOFF"].includes(t.status) &&
        t.attempts_for_fingerprint < 2 &&
        t.probe &&
        t.next_probe_at &&
        Date.parse(t.next_probe_at) <= now,
    )
    .sort(
      (a, b) => a.priority - b.priority || a.task_id.localeCompare(b.task_id),
    )
    .map((t) => t.task_id);
  // Workflow proofs for a different head cannot unlock a dependent certificate.
  // Preserve the tasks in the graph, but exclude stale READY candidates.
  const admissible = state.tasks.map(t => t.status === 'READY' && t.dependencies.some(id => {
    const d = state.tasks.find(x => x.task_id === id);
    return t.pr_effect === 'EXISTING_PR' && d.target_pr === t.target_pr && d.inputs.sha !== t.inputs.sha;
  }) ? {...t,authorized:false} : t);
  const candidate = decide(admissible, now, owner_id ?? 'planning-only',state.portfolio,state.merge_policy);
  const picked = candidate.kind === 'EXECUTE_ONE'
    ? state.tasks.find(t=>t.task_id===candidate.taskId) : null;
  // Keep quiet NOOP semantics while exposing a blocked PR admission to diagnostics.
  // A blocked task must never create a worktree, write the ledger or alert by itself.
  const admissionBlocked = !picked && !probes.length &&
    candidate.kind === 'PROTECTED_NOOP' &&
    candidate.reason === 'pr-admission-gate-blocked';
  return {
    action:
      picked && material_budget > 0
        ? "EXECUTE"
        : probes.length
          ? "PROBE"
          : "NOOP",
    selected: picked?.task_id ?? null,
    reason:
      picked && material_budget === 0
        ? "CYCLE_MATERIAL_BUDGET_CONSUMED"
        : admissionBlocked
          ? "PR_ADMISSION_BLOCKED"
          : "NO_ELIGIBLE_CHANGE",
    probes,
    notifications,
    writes: false,
  };
}

export function transition(state, id, event, now) {
  validate(state);
  const next = copy(state);
  const t = next.tasks.find((x) => x.task_id === id);
  if (!t) throw Error("UNKNOWN_TASK");
  const original = stable(t);
  if (event.type === "inputs") {
    const fp = hash(event.inputs);
    if (fp === t.input_fingerprint) return state;
    if (
      t.status === "RUNNING" ||
      t.operations.some((o) => o.state === "UNCERTAIN")
    )
      throw Error("RECONCILE_BEFORE_INPUT_CHANGE");
    t.inputs = copy(event.inputs);
    t.input_fingerprint = fp;
    t.attempts_for_fingerprint = 0;
    t.failure_fingerprint = null;
    t.no_progress_cycles=0;t.stalled_on_fingerprint=null;t.last_cycle_id=null;
    t.observation_fingerprint=null;t.probe_no_change_count=0;t.last_probe_id=null;t.last_attempt_id=null;
    t.owner_id = null;
    t.evidence_sha = null;
    t.status = ["WAIT_HUMAN", "BLOCKED_PROTECTED"].includes(t.status)
      ? t.status
      : t.probe
        ? "WAIT_CI"
        : "READY";
    t.next_probe_at = t.probe ? iso(now) : null;
  } else if (event.type === "claim") {
    if (
      event.lock_owner !== event.owner_id ||
      !event.owner_id ||
      plan(state, { now, material_budget: 1 }).selected !== id ||
      PROTECTED.includes(t.action)
    )
      throw Error("CLAIM_DENIED");
    t.status = "RUNNING";
    t.owner_id = event.owner_id;
  } else if (event.type === "human-cleared") {
    if (
      t.status !== "WAIT_HUMAN" ||
      event.source !== "human-message" ||
      !event.evidence_sha ||
      !t.proof_requirements?.length ||
      !t.proof_requirements.every((r) =>
        event.proofs?.some(
          (p) =>
            p.requirement === r &&
            p.result === "PASS" &&
            p.sha === t.inputs.sha,
        ),
      )
    )
      throw Error("HUMAN_PROOF_REQUIRED");
    t.status = "DONE";
    t.evidence_sha = t.inputs.sha;
    t.next_probe_at = null;
    t.human_action_required = null;
    t.evidence.push({
      sha: t.inputs.sha,
      result: "PASS",
      input_fingerprint: t.input_fingerprint,
      evidence_sha: event.evidence_sha,
      scope:
        "Existing human prerequisites only; no migration authorization inferred",
    });
  } else if (event.type === "candidate") {
    if (
      t.status !== "RUNNING" ||
      t.owner_id !== event.owner_id ||
      !/^[0-9a-f]{40}$/.test(event.sha) ||
      t.operations.some((o) => o.state === "UNCERTAIN")
    )
      throw Error("CANDIDATE_DENIED");
    t.inputs.sha = event.sha;
    t.input_fingerprint = hash(t.inputs);
    t.evidence_sha = null;
    t.failure_fingerprint = null;
    t.attempts_for_fingerprint = 0;
    t.no_progress_cycles=0;t.stalled_on_fingerprint=null;t.last_cycle_id=null;
  } else if (event.type === "operation-intent") {
    if (
      t.status !== "RUNNING" ||
      t.owner_id !== event.owner_id ||
      PROTECTED.includes(event.action) ||
      !["normal-code-push"].includes(event.action) ||
      t.operations.some(
        (o) => o.state === "UNCERTAIN" || o.operation_id === event.operation_id,
      )
    )
      throw Error("OPERATION_DENIED");
    t.operations.push({
      operation_id: event.operation_id,
      action: event.action,
      expected_sha: event.expected_sha,
      state: "UNCERTAIN",
    });
  } else if (event.type === "reconcile-operation") {
    const operation = t.operations.find(
      (o) => o.operation_id === event.operation_id,
    );
    if (
      !operation ||
      !["APPLIED", "NOT_APPLIED", "UNKNOWN"].includes(event.result) ||
      !event.evidence_sha ||
      event.expected_sha !== operation.expected_sha
    )
      throw Error("RECONCILIATION_REQUIRED");
    if (event.result !== "UNKNOWN") {
      if(event.result === 'APPLIED' && externalProof(operation,event.result).kind !== 'ALREADY_DONE')
        throw Error('EXTERNAL_RECONCILIATION_DENIED');
      operation.state = event.result;
      operation.evidence_sha = event.evidence_sha;
    }
  } else if(event.type === 'cycle-complete') {
    if(t.status !== 'RUNNING' || t.owner_id!==event.owner_id)throw Error('OWNER_MISMATCH');
    if(t.operations.some(o=>o.state==='UNCERTAIN'))throw Error('RECONCILE_BEFORE_RESULT');
    const updated=cycleBackstop(t,event,now);
    if(updated===t)return state;
    Object.assign(t,updated,{owner_id:null});
    if(t.status==='RUNNING')t.status='READY';
    delete t.lease;
  } else if (event.type === "result") {
    if(event.attempt_id && t.last_attempt_id===event.attempt_id)return state;
    if(event.probe_id && t.last_probe_id===event.probe_id)return state;
    if (
      event.input_fingerprint !== t.input_fingerprint ||
      event.sha !== t.inputs.sha
    )
      throw Error("STALE_EVIDENCE");
    if (t.status === "RUNNING" && event.owner_id !== t.owner_id)
      throw Error("OWNER_MISMATCH");
    if (["WAIT_HUMAN", "BLOCKED_PROTECTED"].includes(t.status))
      throw Error("PROTECTED_TRANSITION");
    if (t.operations.some((o) => o.state === "UNCERTAIN"))
      throw Error("RECONCILE_BEFORE_RESULT");
    if (event.result === "PASS") {
      if (!event.evidence_sha || !event.scope) throw Error("EVIDENCE_REQUIRED");
      if(t.proof_contract==='COST_AND_EXACT_PREVIEW_V1' &&
        (t.contract_results?.sha!==t.inputs.sha || t.contract_results?.cost02!=='SUCCESS' ||
          t.contract_results?.preview?.status!=='DEPLOY_READY_EXACT'))
        throw Error('CONTRACT_JOB_AND_PREVIEW_EVIDENCE_REQUIRED');
      t.evidence.push({
        sha: event.sha,
        result: "PASS",
        input_fingerprint: t.input_fingerprint,
        evidence_sha: event.evidence_sha,
        scope: event.scope,
      });
      t.evidence_sha = event.sha;
      t.status = "DONE";
      t.owner_id = null;
      t.next_probe_at = null;
    } else if (event.result === "PENDING") {
      t.status = "WAIT_CI";
      t.owner_id = null;
      t.next_probe_at = iso(
        now +
          Math.min(
            6 * 3600000,
            Math.max(40 * 60000, (t.probe_delay_ms ?? 20 * 60000) * 2),
          ),
      );
      t.probe_delay_ms = Date.parse(t.next_probe_at) - now;
      Object.assign(t,probeBackstop(t,{probe_id:event.probe_id ?? hash([t.input_fingerprint,now]),
        observation_fingerprint:event.observation_fingerprint ?? hash({result:'PENDING',sha:event.sha})},now));
    } else if (event.result === "FAIL") {
      const fp = hash([t.input_fingerprint, event.failure]);
      t.attempts_for_fingerprint =
        fp === t.failure_fingerprint ? t.attempts_for_fingerprint + 1 : 1;
      t.failure_fingerprint = fp;
      t.owner_id = null;
      t.status =
        t.attempts_for_fingerprint >= 2 ? "WAIT_EXTERNAL" : "RETRY_BACKOFF";
      t.next_probe_at =
        t.attempts_for_fingerprint >= 2 ? null : iso(now + 40 * 60000);
      t.last_attempt_id=event.attempt_id ?? null;
    } else throw Error("NOT_A_PROOF_RESULT");
  } else if (event.type === "notified") {
    const expected = hash([
      t.input_fingerprint,
      t.failure_fingerprint,
      t.human_action_required,
    ]);
    if (event.fingerprint !== expected) throw Error("STALE_NOTIFICATION");
    t.last_notified_fingerprint = expected;
  } else throw Error("UNKNOWN_EVENT");
  if (original === stable(t)) return state;
  // Probe scheduling is persistent, but is not a material change or a reason to notify.
  if (
    !(event.type === "result" && event.result === "PENDING") &&
    event.type !== "notified"
  )
    t.last_material_change = iso(now);
  next.revision++;
  return validate(next);
}

export function seedTasks(c) {
  const done = (id, priority, candidate, scope) => {
    const sha = candidate.sha;
    const t = task({
      task_id: id,
      priority,
      inputs: { sha, contract: scope },
      status: "WAIT_EXTERNAL",
    });
    if (
      !candidate.evidence?.some(
        (e) => e.sha === sha && e.result === "PASS_RECORDED_REMOTE",
      )
    )
      return t;
    return transition(
      { schema_version: 2, revision: 0, tasks: [t] },
      id,
      {
        type: "result",
        result: "PASS",
        sha,
        input_fingerprint: t.input_fingerprint,
        evidence_sha: sha,
        scope,
      },
      0,
    ).tasks[0];
  };
  const radio = c.candidates.publicDiscovery.sha;
  const tasks = [
    done(
      "pr553-domain",
      1,
      c.candidates.searchContext,
      "Recorded own-head Quality/Civic; not schema/merge/Production",
    ),
    task({
      task_id: "school-human-proof",
      priority: 2,
      inputs: { sha: c.candidates.product.sha, contract: hash(c.dependencies) },
      status: "WAIT_HUMAN",
      proof_requirements: [
        "lab-exclusive-turnstile",
        "positive-human-captcha",
        "five-existing-flows",
      ],
      human_action_required:
        "Responsável da Escola: Turnstile exclusivo do laboratório, CAPTCHA humano e cinco fluxos; sem credenciais no chat",
      last_notified_fingerprint: null,
    }),
    task({
      task_id: "school-protected-release",
      priority: 3,
      inputs: {
        sha: c.candidates.product.sha,
        contract: hash(c.authorization.schoolMigration),
      },
      dependencies: ["school-human-proof"],
      status: "BLOCKED_PROTECTED",
      action: "migration",
    }),
    task({
      task_id: "pr552-quality",
      priority: 4,
      inputs: { sha: radio, contract: "Quality exact head", run: 38908088514 },
      status: "WAIT_CI",
      probe: { kind: "github-run", run: 38908088514, pr: 552 },
      next_probe_at: "2026-10-16T13:56:29.000Z",
    }),
    task({
      task_id: "radio-publication-date",
      priority: 5,
      inputs: {
        sha: radio,
        contract:
          "U0/SOC-D06: existing published_at UTC in both detail shells; invalid/missing explicit; fresh comun-preview on material push",
      },
      dependencies: ["pr552-quality"],
      action: "local-code",
      source:
        "docs/comun-product-objective-and-roadmap.md#recuperação-operacional-e-rádio-pública--16102026",
    }),
    task({
      task_id: "pr552-cost-publication",
      priority: 6,
      inputs: {
        sha: radio,
        contract:
          "checkpoint-stale: resolve only with legitimate next material delivery/exact Preview",
      },
      dependencies: ["radio-publication-date"],
      status: "WAIT_EXTERNAL",
      action: "local-code",
    }),
    task({
      task_id: "pr554-domain",
      priority: 7,
      inputs: {
        sha: c.candidates.homePilot.sha,
        contract:
          "Recorded 30 SUCCESS/81 SKIPPED; no review/merge/integration certification",
      },
      status: "WAIT_EXTERNAL",
      source: "reports/current/comun-recovery-and-radio-20261016.md",
    }),
    task({
      task_id: "candidate-integration",
      priority: 8,
      inputs: {
        sha: c.mainObserved,
        heads: [
          radio,
          c.candidates.searchContext.sha,
          c.candidates.homePilot.sha,
        ],
      },
      status: "BLOCKED_PROTECTED",
      action: "merge",
    }),
  ];
  // This human blocker was already communicated in V1; migration must not alert again.
  for (const t of tasks)
    if (t.status === "WAIT_HUMAN" && t.human_action_required)
      t.last_notified_fingerprint = hash([
        t.input_fingerprint,
        t.failure_fingerprint,
        t.human_action_required,
      ]);
  return tasks;
}
