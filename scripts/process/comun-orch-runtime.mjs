import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {previewProof} from './comun-orch-adapter.mjs';
import {nextObservation, reconcileOne, readTracked, watchSpec} from './comun-orch-reconcile.mjs';
import {chooseDiscoveryLane, replenish, readDiscovery, permitted, replenishMergeDiscovery, readMergeDiscovery, mergePermitted, readRoadmapDiscovery, admitRoadmapDiscovery, roadmapAuthorized} from './comun-orch-discovery.mjs';
import {scopeRailTasks} from './comun-orch-rail.mjs';
import {
  hash,
  plan,
  seedTasks,
  transition,
  validate,
} from "./comun-orch-v2.mjs";

export const REMOTE =
  "https://github.com/alexandrevrabandonada-oss/comunvrabandonada.git";
export const REF = "refs/comun/roadmap-execution";
const CHECKPOINT = "reports/current/comun-execution-checkpoint.json";
const REPOSITORY = "alexandrevrabandonada-oss/comunvrabandonada";
const lockProofs=new Map();
const read = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
const git = (repo, ...args) =>
  execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    timeout: 30000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
export function atomicJson(file, value, expectedHash = null, guard = () => {}) {
  if (expectedHash === null && fs.existsSync(file))
    throw Error("LEDGER_ALREADY_EXISTS");
  if (
    expectedHash !== null &&
    (!fs.existsSync(file) || hash(read(file)) !== expectedHash)
  )
    throw Error("LEDGER_CAS_CONFLICT");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  const fd = fs.openSync(temp, "wx");
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2) + "\n");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    guard();
    if(expectedHash !== null && (!fs.existsSync(file) || hash(read(file))!==expectedHash))
      throw Error('LEDGER_CAS_CONFLICT');
    if(expectedHash===null && fs.existsSync(file))throw Error('LEDGER_ALREADY_EXISTS');
    fs.renameSync(temp, file);
  } catch (error) {
    fs.unlinkSync(temp);
    throw error;
  }
}
export function acquireLock(common, id) {
  const dir = path.join(common, "comun-roadmap-cycle.lock");
  try {
    fs.mkdirSync(dir);
  } catch (error) {
    if (error.code === "EEXIST") return null;
    throw error;
  }
  const owner = {
    id,
    pid: process.pid,
    processStart: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    machine: os.hostname(),
    startedAt: new Date().toISOString(),
    protocol: "COMUN_ORCH_V2",
    processSession: process.env.CODEX_THREAD_ID ?? null,
  };
  try {
    atomicJson(path.join(dir, "owner.json"), owner);
    lockProofs.set(path.resolve(dir),hash(read(path.join(dir,'owner.json'))));
  } catch (error) {
    fs.rmdirSync(dir);
    throw error;
  }
  return owner;
}
export function releaseLock(common, id, expectedHash=lockProofs.get(path.resolve(common,'comun-roadmap-cycle.lock'))) {
  const dir = path.join(common, "comun-roadmap-cycle.lock");
  const file = path.join(dir, "owner.json");
  if (!fs.existsSync(file) || JSON.parse(read(file)).id !== id ||
    !expectedHash || hash(read(file))!==expectedHash) return false;
  fs.unlinkSync(file);
  fs.rmdirSync(dir);
  lockProofs.delete(path.resolve(dir));
  return true;
}
export function inspectLock(common) {
  const dir = path.join(common, "comun-roadmap-cycle.lock");
  if (!fs.existsSync(dir)) return { state: "FREE" };
  let owner;
  try {
    owner = JSON.parse(read(path.join(dir, "owner.json")));
  } catch {
    return { state: "ORPHAN_UNKNOWN", fingerprint: hash(fs.existsSync(path.join(dir,'owner.json'))?
      read(path.join(dir,'owner.json')):fs.readdirSync(dir).sort()) };
  }
  let alive = false;
  if (owner.machine === os.hostname() && Number.isInteger(owner.pid) && owner.pid > 0) {
    try {
      process.kill(owner.pid, 0);
      alive = true;
    } catch (error) {
      if (error.code === "EPERM") alive = true;
    }
  }
  // A live/reused PID always blocks. A dead PID never authorizes lock recovery.
  return {
    state: alive ? "HELD_LIVE" : "ORPHAN_UNKNOWN",
    fingerprint: hash(read(path.join(dir,'owner.json'))),
    owner_id: owner.id,
  };
}
export function context(repo, expectedRemote = REMOTE) {
  if (
    git(repo, "remote", "get-url", "origin") !== expectedRemote ||
    git(repo, "remote", "get-url", "--push", "origin") !== expectedRemote
  )
    throw Error("REPOSITORY_CHANGED");
  const common = git(
    repo,
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  );
  const canonical = git(repo, "rev-parse", "--verify", REF);
  const checkpoint = JSON.parse(
    git(repo, "show", `${canonical}:${CHECKPOINT}`),
  );
  if (!checkpoint.orchV2)
    throw Error("V2_NOT_ACTIVATED_IN_CANONICAL_CHECKPOINT");
  return {
    repo,
    common,
    canonical,
    checkpoint,
    ledger: path.join(common, "comun-orch-v2", "state.json"),
  };
}
export function loadState(ctx) {
  if (!fs.existsSync(ctx.ledger))
    return {
      state: validate(structuredClone(ctx.checkpoint.orchV2)),
      expectedHash: null,
    };
  const raw = read(ctx.ledger);
  const envelope = JSON.parse(raw);
  if (
    envelope.remote !== REMOTE ||
    path.resolve(envelope.common) !== path.resolve(ctx.common)
  )
    throw Error("LEDGER_REPOSITORY_CHANGED");
  if (envelope.canonical !== ctx.canonical) {
    try {
      git(
        ctx.repo,
        "merge-base",
        "--is-ancestor",
        envelope.canonical,
        ctx.canonical,
      );
    } catch {
      throw Error("CANONICAL_RECONCILIATION_REQUIRED");
    }
  }
  const state = validate(envelope.state);
  // Reconcile only pertinent V1 inputs. Timestamp-only/checkpoint-only commits do not invalidate tests.
  // Operational ledger is newer than checkpoint snapshots. Only explicit observed
  // input events may change it; a documentation descendant cannot roll it backward.
  return { state, expectedHash: hash(raw), envelope };
}
export function ownerProof(ctx,id) {
  const bytes=read(path.join(ctx.common,'comun-roadmap-cycle.lock','owner.json'));
  const owner=JSON.parse(bytes);
  if(!id || owner.id!==id || owner.machine!==os.hostname() || !owner.processStart)
    throw Error('OWNER_MISMATCH');
  return hash(bytes);
}
export function saveState(ctx, state, expectedHash, ownerId) {
  const proof=ownerProof(ctx,ownerId);
  const guard=()=>{
    if(ownerProof(ctx,ownerId)!==proof)throw Error('OWNER_BYTES_CHANGED');
    if(git(ctx.repo,'rev-parse',REF)!==ctx.canonical)throw Error('CANONICAL_CAS_CONFLICT');
  };
  guard();
  if (git(ctx.repo, "rev-parse", REF) !== ctx.canonical)
    throw Error("CANONICAL_CAS_CONFLICT");
  atomicJson(
    ctx.ledger,
    {
      ...(fs.existsSync(ctx.ledger)?JSON.parse(read(ctx.ledger)):{}),
      remote: REMOTE,
      common: ctx.common,
      canonical: ctx.canonical,
      state: validate(state),
    },
    expectedHash, guard,
  );
}
export function integrate556(ctx,ownerId,{candidate_sha,source_evidence_sha,cost_job}) {
  ownerProof(ctx,ownerId);
  if(candidate_sha!=='ba872d74474e077d7dcf06800b81523a77ce4433' || !source_evidence_sha)
    throw Error('PINNED_CANDIDATE_EVIDENCE_REQUIRED');
  const loaded=loadState(ctx);
  if(loaded.state.integration556?.candidate_sha===candidate_sha)
    return {changed:false,state:loaded.state};
  if(loaded.state.tasks.some(t=>t.status==='RUNNING' || t.operations.some(o=>o.state==='UNCERTAIN')))
    throw Error('RECONCILE_BEFORE_MIGRATION');
  const state=structuredClone(loaded.state);
  const publication=state.tasks.find(t=>t.task_id==='pr552-cost-publication');
  if(publication) {
    publication.proof_reconciliation={previous_status:publication.status,previous_evidence_sha:publication.evidence_sha,
      previous_inputs:structuredClone(publication.inputs),reason:'Aggregate workflow evidence does not prove own COST job and exact Preview',
      source_evidence_sha};
    publication.proof_contract='COST_AND_EXACT_PREVIEW_V1';
    const costPassed=cost_job?.sha===publication.inputs.sha && cost_job.run===publication.inputs.run &&
      cost_job.name==='COST-02 / exact checkpoint Preview' && cost_job.conclusion==='success' && cost_job.status==='completed';
    publication.contract_results={sha:publication.inputs.sha,cost02:costPassed?'SUCCESS':'UNVERIFIED',
      cost_job:cost_job??null,preview:{status:'UNVERIFIED',satisfied:false},source_evidence_sha};
    publication.status='WAIT_EXTERNAL';publication.evidence_sha=null;publication.next_probe_at=null;
    // Existing aggregate evidence remains in evidence[], explicitly bounded above.
  }
  state.integration556={candidate_sha,source_evidence_sha,prior_ledger_sha:loaded.expectedHash,
    adapter_version:1,ledger_authority:'Explicit observed inputs; no checkpoint rewind'};
  state.revision++;
  saveState(ctx,state,loaded.expectedHash,ownerId);
  return {changed:true,state};
}
export function canonicalCAS(repo, next, observed, preserveRef) {
  // Retain losing work before attempting the canonical CAS; never touch branch tips.
  git(repo, "merge-base", "--is-ancestor", observed, next);
  git(repo, "update-ref", preserveRef, next, "0".repeat(40));
  git(repo, "update-ref", REF, next, observed);
}
export function probeRun(t) {
  const runId = t.inputs.run;
  if (!Number.isSafeInteger(runId) || runId <= 0)
    throw Error("RUN_DISCOVERY_REQUIRED");
  if (t.probe.pr) {
    const liveHead = execFileSync(
      "gh",
      ["api", `repos/${REPOSITORY}/pulls/${t.probe.pr}`, "--jq", ".head.sha"],
      { encoding: "utf8", timeout: 30000 },
    ).trim();
    if (liveHead !== t.inputs.sha) throw Error("STALE_REMOTE_HEAD");
  }
  const raw = execFileSync(
    "gh",
    ["api", `repos/${REPOSITORY}/actions/runs/${runId}`],
    { encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 },
  );
  const r = JSON.parse(raw);
  if (r.head_sha !== t.inputs.sha) throw Error("STALE_REMOTE_HEAD");
  // Aggregate workflow success is never a COST-02/Preview certificate.
  if(t.probe.kind !== 'github-run' || /COST|Preview/i.test(t.inputs.contract))
    throw Error('CONTRACT_JOB_AND_PREVIEW_EVIDENCE_REQUIRED');
  return {
    sha: r.head_sha,
    input_fingerprint: t.input_fingerprint,
    result:
      r.status !== "completed"
        ? "PENDING"
        : r.conclusion === "success"
          ? "PASS"
          : "FAIL",
    failure: { run: r.id, conclusion: r.conclusion },
    evidence_sha: hash({
      id: r.id,
      head_sha: r.head_sha,
      status: r.status,
      conclusion: r.conclusion,
      run_attempt: r.run_attempt,
    }),
    scope: `GitHub Actions run ${r.id}, ${r.html_url}; exact SHA only; not Production`,
  };
}
export function prepareExistingBase(ctx, claimed) {
  git(ctx.repo, 'fetch', '--no-tags', 'origin', claimed.branch);
  const base = git(ctx.repo, 'rev-parse', 'FETCH_HEAD');
  if (base !== claimed.inputs.sha) throw Error('DISCOVERY_HEAD_MOVED');
  return base;
}
export function tick(
  ctx,
  {
    now = Date.now(),
    simulate = false,
    material_budget = 1,
    worktreeRoot = "E:/COMUN-ROADMAP-CYCLES",
    probe = probeRun,
    observeExternal = readTracked,
    reconcile = true,
    observer_control = undefined,
    discover = readDiscovery,
    discoverMerge = readMergeDiscovery,
    resolveExecutionBase = prepareExistingBase,
  } = {},
) {
  const lock = inspectLock(ctx.common);
  if (lock.state !== "FREE")
    return {
      action: "NOOP",
      reason: lock.state,
      lock_fingerprint: lock.fingerprint,
      notify: false,
      writes: 0,
      worktrees: 0,
    };
  const { state: initial, expectedHash } = loadState(ctx);
  if (simulate)
    return {
      ...plan(initial, { now, material_budget }),
      simulate: true,
      writes: 0,
      worktrees: 0,
    };
  // In single-track mode, the canonical station sequence, not arbitrary
  // historical PR readiness, governs which code task may be executed.
  const strictRail = ctx.checkpoint.roadmap_backlog?.rail !== undefined ||
    initial.roadmap_discovery?.standing_build?.enabled === true;
  const runtimeRail = state => strictRail ? scopeRailTasks(
    ctx.checkpoint.roadmap_backlog,state,{
      required:state.roadmap_discovery?.standing_build?.enabled === true}) : null;
  const runtimePlan = state => {
    const scoped=runtimeRail(state);
    const p = plan(scoped?.state??state,{now,material_budget});
    // Tracked reconciliation owns these reads, including suspended old run probes.
    if (reconcile) p.probes = p.probes.filter(id => !watchSpec(state.tasks.find(t=>t.task_id===id)));
    if (strictRail) p.probes=p.probes.filter(id => {
      const t=state.tasks.find(t=>t.task_id===id);
      return t && scoped.rail.station_id!==null &&
        (t.task_id===scoped.rail.station_id || t.roadmap_item===scoped.rail.station_id);
    });
    if (p.action === 'PROBE' && !p.probes.length) p.action = 'NOOP';
    return p;
  };
  const preplan=runtimePlan(initial);
  // Delivery accounting is read-only and must not depend on permission to
  // discover repairs. Otherwise a denied/absent grant hides repeated empty wakes.
  observer_control = structuredClone(observer_control ?? {version:1,cursors:{}});
  const last = initial.delivery_metrics?.last_material_delivery_at ?? null;
  const monitor = observer_control.delivery_monitor;
  const previousCycles = Number.isSafeInteger(monitor?.cycles_since_delivery) &&
    monitor.cycles_since_delivery >= 0 ? monitor.cycles_since_delivery : 0;
  const progress = {last_material_delivery_at:last,
    last_material_delivery_sha:initial.delivery_metrics?.last_material_delivery_sha ?? null,
    elapsed_ms:last ? now-Date.parse(last) : null,
    cycles_since_delivery:last !== monitor?.last_material_delivery_at ? 1 : previousCycles+1,
    history_start:'Explicit APPLIED normal-code-push only; older unknown timestamps are not inferred'};
  observer_control.delivery_monitor = progress;
  // Do not starve a repair intake while the docs merge intake polls every wake.
  // Both lanes remain gated by their individual authorization and cooldown.
  const dueLane = strictRail ? null : chooseDiscoveryLane(initial,now,observer_control,material_budget);
  const mergeNow = dueLane === 'merge';
  const discoverNow = dueLane === 'repair';
  const roadmapNow = initial.roadmap_discovery?.enabled === true && material_budget > 0 &&
    !['EXECUTE', 'RECONCILE'].includes(preplan.action);
  const observedTask = !mergeNow && !discoverNow && reconcile && preplan.action !== 'EXECUTE'
    ? nextObservation(initial,now,observer_control) : null;
  const station=runtimeRail(initial)?.rail.station_id;
  const observationTask = !strictRail || observedTask?.task_id===station ? observedTask : null;
  if(fs.existsSync(ctx.ledger) && !mergeNow && !discoverNow && !roadmapNow && !observationTask && !preplan.probes.length && !preplan.notifications.length &&
    ['NOOP','RECONCILE'].includes(preplan.action))return {...preplan,owner_id:null,worktree:null,
      canonical:ctx.canonical,materialChanges:[],observer_control,progress,notify:false,writes:0,worktrees:0,next:null};
  const id = `orchv2-${randomUUID()}`;
  if (!acquireLock(ctx.common, id))
    return { action: "NOOP", reason: "LOCK_RACE", writes: 0, worktrees: 0 };
  let retainLock = false;
  try {
    // Reread after the lock: a plan made before acquisition is never an ownership proof.
    const fresh = context(ctx.repo);
    if (fresh.canonical !== ctx.canonical)
      throw Error("CANONICAL_CAS_CONFLICT");
    const loaded = loadState(ctx);
    if (loaded.expectedHash !== expectedHash)
      throw Error("LEDGER_CAS_CONFLICT");
    let state = loaded.state;
    const priorHash = hash(state);
    const p = runtimePlan(state);
    if (p.action === "RECONCILE")
      return { ...p, notify: false, writes: 0, worktrees: 0 };
    const materialChanges = [];
    let observation = null, discovery = null, mergeDiscovery = null, roadmapDiscovery = null, readNotifications = [];
    if (mergeNow) {
      const found = replenishMergeDiscovery(state,{now,observer_control,read:discoverMerge});
      state=found.state; observer_control=found.observer_control;
      mergeDiscovery=found.merge_discovery;
    } else if (discoverNow) {
      const found = replenish(state, {now, observer_control, read: discover});
      state = found.state; observer_control = found.observer_control;
      discovery = found.discovery; readNotifications = found.notifications;
    }
    if (roadmapNow && runtimePlan(state).action !== 'EXECUTE') {
      const source = readRoadmapDiscovery(ctx, state);
      state = admitRoadmapDiscovery(state, source);
      roadmapDiscovery = {reason: source.reason,
        admitted: source.candidate?.item.task_id ?? null, evidence_sha: hash(source)};
    }
    if (observationTask) {
      const observed = reconcileOne(state,state.tasks.find(t=>t.task_id===observationTask.task_id),now,observeExternal,observer_control);
      observer_control = observed.observer_control;
      state = observed.state;
      observation = observed.observation;
      readNotifications = observed.notifications;
      if (observed.material) materialChanges.push({task_id:observation.task_id,
        result:'EXTERNAL_INPUT_CHANGED',sha:state.tasks.find(t=>t.task_id===observation.task_id).inputs.sha,
        source_evidence_sha:observation.source_evidence_sha});
    }
    // At most one cheap due probe per wake; no heavy/unchanged service inventory.
    if (!mergeNow && !discoverNow && !observationTask && p.probes.length) {
      const t = state.tasks.find((t) => t.task_id === p.probes[0]);
      try {
        const result = probe(t);
        result.probe_id=`${t.input_fingerprint}:${t.next_probe_at}`;
        state = transition(
          state,
          t.task_id,
          { type: "result", ...result },
          now,
        );
        if (result.result !== "PENDING")
          materialChanges.push({
            task_id: t.task_id,
            result: result.result,
            sha: result.sha,
          });
      } catch (error) {
        state = transition(
          state,
          t.task_id,
          {
            type: "result",
            result: "FAIL",
            attempt_id:`probe:${t.input_fingerprint}:${t.next_probe_at}`,
            sha: t.inputs.sha,
            input_fingerprint: t.input_fingerprint,
            failure: {
              kind: "PROBE_ERROR",
              code: error.message.startsWith("STALE_")
                ? "STALE_REMOTE_HEAD"
                : "READ_FAILED",
            },
          },
          now,
        );
      }
    }
    let decision = runtimePlan(state);
    const notifications = decision.notifications;
    for (const n of notifications)
      state = transition(
        state,
        n.task_id,
        { type: "notified", fingerprint: n.fingerprint },
        now,
      );
    let worktree = null;
    if (decision.action === "EXECUTE") {
      // The same rail-scoped priority view must reach claim admission.
      // Otherwise transition() re-plans the unscoped legacy queue and can
      // reject the chosen station behind a lower-priority historical task.
      const scopedClaim=runtimeRail(state)?.state ?? state;
      const claimedView=transition(scopedClaim,decision.selected,
        {type:"claim",owner_id:id,lock_owner:id},now);
      if(scopedClaim!==state){
        // Never persist temporary authorization masks into the human ledger.
        for(const [index,original] of state.tasks.entries()){
          if(claimedView.tasks[index]?.task_id!==original.task_id)
            throw Error("ROADMAP_RAIL_CLAIM_SCOPE_CHANGED");
          claimedView.tasks[index].authorized=original.authorized;
        }
      }
      state=validate(claimedView);
      const claimed=state.tasks.find(t=>t.task_id===decision.selected);
      let baseSha = ctx.canonical;
      if (claimed.execution_base === 'PR_HEAD') {
        const roadmapBuild = claimed.discovery?.recipe === 'ROADMAP_SCOPED_BUILD';
        const allowed = roadmapBuild ? roadmapAuthorized(state,claimed) : permitted(state);
        if (!claimed.discovery || !allowed || claimed.authorized !== true)
          throw Error('EXISTING_BRANCH_AUTHORIZATION_REQUIRED');
        baseSha = resolveExecutionBase(ctx, claimed);
        if (baseSha !== claimed.inputs.sha) throw Error('DISCOVERY_HEAD_MOVED');
      }
      const docsMerge = claimed.action === 'integrate-existing-pr';
      if (docsMerge && (!mergePermitted(state) || claimed.work_class!=='INTEGRATION' ||
        claimed.pr_effect!=='EXISTING_PR' ||
        claimed.merge_authorization?.evidence_sha!==state.merge_policy.evidence_sha))
        throw Error('MERGE_EXECUTION_NOT_AUTHORIZED');
      worktree = docsMerge ? null : path.resolve(worktreeRoot,id);
      claimed.lease={owner_id:id,owner_proof:ownerProof(ctx,id),cycle_id:id,worktree,
        started_at:new Date(now).toISOString(),deadline_at:new Date(now+25*60000).toISOString(),base_sha:baseSha,
        before_evidence:hash({inputs:claimed.inputs,evidence:claimed.evidence,operations:claimed.operations})};
      // Persist intent/lease BEFORE worktree creation. On interruption, preserve and reconcile.
      saveState(ctx, state, expectedHash,id);
      retainLock = true;
      if (!docsMerge) {
        if (worktree === path.resolve(ctx.repo) || fs.existsSync(worktree))
          throw Error("ISOLATION_PATH_INVALID");
        git(ctx.repo, "worktree", "add", "--detach", worktree, baseSha);
        if (git(worktree,"status","--porcelain") ||
          path.resolve(git(worktree,"rev-parse","--path-format=absolute","--git-common-dir"))!==path.resolve(ctx.common) ||
          git(worktree,"remote","get-url","origin")!==REMOTE)
          throw Error("ISOLATION_INVALID");
      }
    } else if (hash(state) !== priorHash || !fs.existsSync(ctx.ledger))
      saveState(ctx, state, expectedHash,id);
    return {
      ...decision,
      action:(mergeNow || discoverNow) && decision.action !== 'EXECUTE' ? 'OBSERVE' : decision.action === 'NOOP' && observation ? 'OBSERVE' : decision.action,
      reason:mergeNow && decision.action !== 'EXECUTE' ? 'DOCS_MERGE_DISCOVERY' : discoverNow && decision.action !== 'EXECUTE' ? 'QUEUE_DISCOVERY' : decision.action === 'NOOP' && observation ?
        (observation.error_fingerprint ? 'TRACKED_READ_FAILED' : 'TRACKED_OBSERVATION') : decision.reason,
      owner_id: decision.action==='EXECUTE' ? id : null,
      worktree,
      canonical: ctx.canonical,
      observation,
      discovery,
      merge_discovery:mergeDiscovery,
      roadmap_discovery:roadmapDiscovery,
      progress,
      task: decision.selected ? state.tasks.find(t=>t.task_id===decision.selected) : null,
      observer_control,
      notifications:[...notifications,...readNotifications],
      materialChanges,
      notify: notifications.length > 0 || readNotifications.length > 0 || materialChanges.length > 0,
      writes: hash(state) !== priorHash || expectedHash === null ? 1 : 0,
      worktrees: worktree ? 1 : 0,
      next: decision.selected,
    };
  } finally {
    if (!retainLock) releaseLock(ctx.common, id);
  }
}

export function record(ctx, { owner_id, task_id, event, now = Date.now() }) {
  const owner = JSON.parse(
    read(path.join(ctx.common, "comun-roadmap-cycle.lock", "owner.json")),
  );
  if (!owner_id || owner.id !== owner_id) throw Error("OWNER_MISMATCH");
  const loaded = loadState(ctx);
  const t = loaded.state.tasks.find((t) => t.task_id === task_id);
  if (!t || t.owner_id !== owner_id) throw Error("OWNER_MISMATCH");
  if(t.lease?.owner_proof && ownerProof(ctx,owner_id)!==t.lease.owner_proof)
    throw Error('OWNER_BYTES_CHANGED');
  if(t.action==='integrate-existing-pr' && event.type==='result' && event.result==='PASS') {
    // Only the verified executor may conclude a merge. A caller-supplied
    // PASS/URL without this durable, same-cycle APPLIED record is not proof.
    const applied=t.operations.filter(o=>o.action==='merge-pr'&&o.state==='APPLIED'&&
      o.cycle_id===t.lease?.cycle_id&&o.expected_sha===t.inputs.sha&&
      /^[a-f0-9]{40}$/.test(o.merge_commit_sha??'')&&
      /^[a-f0-9]{64}$/.test(o.evidence_sha??''));
    if(t.status!=='RUNNING'||applied.length!==1||
      event.sha!==t.inputs.sha||event.input_fingerprint!==t.input_fingerprint||
      event.evidence_sha!==applied[0].merge_commit_sha)
      throw Error('VERIFIED_MERGE_APPLIED_PROOF_REQUIRED');
  }
  if(event.type==='operation-intent') {
    if(t.discovery?.recipe==='ROADMAP_SCOPED_BUILD' && !roadmapAuthorized(loaded.state,t))
      throw Error('ROADMAP_AUTHORIZATION_REVOKED');
    if(!t.lease || now>Date.parse(t.lease.deadline_at))throw Error('CYCLE_BUDGET_EXHAUSTED');
    if(t.operations.some(o=>o.cycle_id===t.lease.cycle_id))throw Error('ONE_PUSH_PER_CYCLE');
    if(event.expected_sha!==t.inputs.sha || !/^[0-9a-f]{40}$/.test(event.expected_sha) ||
      event.expected_sha===t.lease.base_sha)throw Error('MATERIAL_CANDIDATE_REQUIRED');
    if(git(t.lease.worktree,'rev-parse','HEAD')!==event.expected_sha ||
      git(t.lease.worktree,'status','--porcelain') ||
      path.resolve(git(t.lease.worktree,'rev-parse','--path-format=absolute','--git-common-dir'))!==path.resolve(ctx.common))
      throw Error('ISOLATED_CANDIDATE_REQUIRED');
    const files=git(ctx.repo,'diff','--name-only',t.lease.base_sha,event.expected_sha).split('\n');
    if(!files.some(f=>/^(app|components|lib|scripts|tests)\//.test(f)))throw Error('MATERIAL_CANDIDATE_REQUIRED');
    if(t.discovery && (files.some(f=>!t.discovery.paths.includes(f)) ||
      git(ctx.repo,'ls-remote','--heads','origin',`refs/heads/${t.branch}`).split(/\s/)[0]!==t.lease.base_sha))
      throw Error('DISCOVERY_SCOPE_OR_REMOTE_HEAD_CHANGED');
  }
  if(event.type==='cycle-complete')event={...event,cycle_id:t.lease?.cycle_id ?? event.cycle_id,
    before_evidence:t.lease?.before_evidence,
    after_evidence:hash({inputs:t.inputs,evidence:t.evidence,operations:t.operations})};
  if (event.type === "candidate")
    git(ctx.repo, "merge-base", "--is-ancestor", t.inputs.sha, event.sha);
  const state = transition(loaded.state, task_id, { ...event, owner_id }, now);
  if(event.type==='operation-intent')state.tasks.find(t=>t.task_id===task_id).operations.at(-1).cycle_id=t.lease.cycle_id;
  if(event.type==='reconcile-operation' && event.result==='APPLIED' &&
    t.operations.find(o=>o.operation_id===event.operation_id)?.state==='UNCERTAIN') {
    const op=state.tasks.find(t=>t.task_id===task_id).operations.find(o=>o.operation_id===event.operation_id);
    op.applied_at=new Date(now).toISOString();
    if(op.action==='normal-code-push')state.delivery_metrics={...(state.delivery_metrics??{}),last_material_delivery_at:op.applied_at,
      last_material_delivery_sha:op.expected_sha,last_material_delivery_task:task_id,
      delivery_count:(state.delivery_metrics?.delivery_count??0)+1};
  }
  if(state !== loaded.state)saveState(ctx, state, loaded.expectedHash,owner_id);
  if (state.tasks.find((t) => t.task_id === task_id).status !== "RUNNING")
    releaseLock(ctx.common, owner_id,t.lease?.owner_proof ?? ownerProof(ctx,owner_id));
  return {
    task_id,
    status: state.tasks.find((t) => t.task_id === task_id).status,
    revision: state.revision,
  };
}

export function observe(ctx, { task_id, event, now = Date.now() }) {
  if (!["inputs", "human-cleared", "notified", "publication-evidence"].includes(event.type))
    throw Error("OBSERVATION_ONLY");
  const id = `observe-${randomUUID()}`;
  if (!acquireLock(ctx.common, id)) throw Error("LOCK_HELD");
  try {
    const loaded = loadState(ctx);
    let state;
    if(event.type==='publication-evidence') {
      state=structuredClone(loaded.state);
      const t=state.tasks.find(t=>t.task_id===task_id);
      if(!t || t.status==='RUNNING' || t.operations.some(o=>o.state==='UNCERTAIN') ||
        ['WAIT_HUMAN','BLOCKED_PROTECTED'].includes(t.status) ||
        event.sha!==t.inputs.sha || event.input_fingerprint!==t.input_fingerprint ||
        event.preview?.headSha!==t.inputs.sha || !event.source_evidence_sha)
        throw Error('STALE_OR_PROTECTED_PUBLICATION_EVIDENCE');
      const cost=event.cost_job;
      const costPassed=cost?.sha===t.inputs.sha && cost.run===t.inputs.run &&
        cost.name==='COST-02 / exact checkpoint Preview' && Number.isSafeInteger(cost.id) &&
        cost.status==='completed' && cost.conclusion==='success';
      const preview=previewProof({...event.preview,cost02:costPassed?'SUCCESS':'UNVERIFIED',exactRequired:true},now);
      const results={sha:t.inputs.sha,cost02:costPassed?'SUCCESS':'UNVERIFIED',cost_job:cost,
        preview,source_evidence_sha:event.source_evidence_sha};
      if(hash(t.contract_results??null)===hash(results))return {task_id,revision:state.revision,status:t.status};
      t.contract_results=results;
      if(preview.status==='DEPLOY_READY_EXACT') {
        state=transition(state,task_id,{type:'result',result:'PASS',sha:t.inputs.sha,
          input_fingerprint:t.input_fingerprint,evidence_sha:event.source_evidence_sha,
          scope:'COST-02 own job and fresh exact Git Preview; no schema/merge/Production certification'},now);
      } else {
        t.status='WAIT_EXTERNAL'; t.next_probe_at=null; t.evidence_sha=null;
        t.last_material_change=new Date(now).toISOString();state.revision++;
      }
    } else state = transition(loaded.state, task_id, event, now);
    if (state !== loaded.state) saveState(ctx, state, loaded.expectedHash,id);
    return {
      task_id,
      revision: state.revision,
      status: state.tasks.find((t) => t.task_id === task_id).status,
    };
  } finally {
    releaseLock(ctx.common, id);
  }
}

// Explicit recovery only: caller supplies a trusted ended-session record, never TTL.
// The original lock bytes are archived, not deleted. This never dispatches work.
export function recover(ctx,{owner_id,lock_sha,ledger_sha,session_file,session_sha}) {
  const dir=path.join(ctx.common,'comun-roadmap-cycle.lock');
  const file=path.join(dir,'owner.json');
  const raw=read(file), previous=JSON.parse(raw);
  const sessionRaw=read(session_file), proof=JSON.parse(sessionRaw);
  if(hash(raw)!==lock_sha || hash(sessionRaw)!==session_sha || !owner_id ||
    previous.machine!==os.hostname() || !previous.processStart || !previous.processSession ||
    !['human-message','verified-session-record'].includes(proof.source) ||
    proof.session!==previous.processSession || proof.owner_id!==previous.id ||
    proof.pid!==previous.pid || proof.processStart!==previous.processStart || proof.host!==previous.machine ||
    proof.status!=='ENDED' || proof.noConcurrentGit!==true || !proof.evidence_sha)
    throw Error('RECOVERY_PROVENANCE_REQUIRED');
  try {process.kill(previous.pid,0);throw Error('OWNER_STILL_LIVE');}
  catch(e) {if(e.code!=='ESRCH')throw e;}
  const loaded=loadState(ctx);
  if(loaded.expectedHash!==ledger_sha || hash(read(file))!==lock_sha ||
    git(ctx.repo,'rev-parse',REF)!==ctx.canonical)throw Error('RECOVERY_CAS_CONFLICT');
  const archive=path.join(ctx.common,`comun-lock-archive-${previous.id}-${randomUUID()}`);
  fs.renameSync(dir,archive);
  if(hash(read(path.join(archive,'owner.json')))!==lock_sha)throw Error('RECOVERY_ARCHIVE_CHANGED');
  if(!acquireLock(ctx.common,owner_id))throw Error('RECOVERY_LOCK_RACE_ARCHIVE_PRESERVED');
  try {
    const state=structuredClone(loaded.state);
    for(const t of state.tasks.filter(t=>t.status==='RUNNING' && t.owner_id===previous.id)) {
      t.recovery_history=[...(t.recovery_history??[]),{previous_owner:previous,lock_sha,session_sha,archive}];
      t.owner_id=owner_id;
      if(t.lease)t.lease={...t.lease,owner_id,owner_proof:ownerProof(ctx,owner_id)};
    }
    state.revision++;
    saveState(ctx,state,ledger_sha,owner_id);
    return {action:'RECONCILE',owner_id,archive,lock_sha};
  } catch(e) {releaseLock(ctx.common,owner_id);throw e;}
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    const option = (name, fallback) =>
      args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
    const ctx = context(path.resolve(option("--repo", process.cwd())));
    if(args[0] && !['record','observe','tick'].includes(args[0]))throw Error('INVALID_ORCH_COMMAND');
    const result = ["record", "observe"].includes(args[0])
      ? (args[0] === "record" ? record : observe)(
          ctx,
          JSON.parse(read(option("--event"))),
        )
      : tick(ctx, {
          simulate: args.includes("--simulate"),
          material_budget: Number(option("--budget", "1")),
        });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.log(
      JSON.stringify({
        action: "PROTECTED_STOP",
        reason: error.message,
        protected: true,
        fatal: true,
        requires_attention: true,
        error_fingerprint: hash(error.message),
        writes: null,
        worktrees: null,
        notify: false,
      }),
    );
    process.exitCode = 1;
  }
}
