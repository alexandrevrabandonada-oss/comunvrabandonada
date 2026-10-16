import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  hash,
  task,
  validate,
  plan,
  transition,
  migrateV1,
  exportV1,
  needsProof,
  PROTECTED,
} from "./comun-orch-v2.mjs";
import {
  REMOTE,
  REF,
  context,
  tick,
  acquireLock,
  releaseLock,
  inspectLock,
  atomicJson,
  canonicalCAS,
  loadState,
  record,
} from "./comun-orch-runtime.mjs";
const now = Date.parse("2026-10-16T14:00:00Z");
const make = (tasks) => ({ schema_version: 2, revision: 0, tasks });
const t = (id = "a", extra = {}) =>
  task({
    task_id: id,
    priority: 1,
    inputs: { sha: "a".repeat(40), contract: "v1" },
    ...extra,
  });
const event = (state, id, result, rest = {}) => ({
  type: "result",
  sha: state.tasks.find((t) => t.task_id === id).inputs.sha,
  input_fingerprint: state.tasks.find((t) => t.task_id === id)
    .input_fingerprint,
  result,
  ...rest,
});
function fixture(tasks) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "comun-orch-test-"));
  const git = (...a) =>
    execFileSync("git", ["-C", repo, ...a], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init");
  git("config", "user.name", "COMUN test");
  git("config", "user.email", "test@example.invalid");
  git("remote", "add", "origin", REMOTE);
  fs.mkdirSync(path.join(repo, "reports/current"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, "reports/current/comun-execution-checkpoint.json"),
    JSON.stringify({ orchV2: make(tasks) }),
  );
  git("add", ".");
  git("commit", "-m", "fixture");
  git("update-ref", REF, "HEAD");
  const ctx = context(repo);
  return {
    repo,
    ctx,
    git,
    cleanup() {
      assert(
        path.resolve(repo).startsWith(path.resolve(os.tmpdir()) + path.sep),
      );
      fs.rmSync(repo, { recursive: true });
    },
  };
}

test("blocked priority never prevents an independent READY delivery; one selected", () => {
  const s = make([
    t("pr553", { status: "BLOCKED_PROTECTED", priority: 1 }),
    t("independent", { priority: 2 }),
    t("another", { priority: 3 }),
  ]);
  assert.equal(plan(s, { now }).selected, "independent");
  assert.equal(plan(s, { now }).action, "EXECUTE");
});
test("two consecutive unchanged hours: NOOP, zero actions and repeated notifications", () => {
  let s = make([
    t("captcha", {
      status: "WAIT_HUMAN",
      human_action_required: "Human CAPTCHA",
    }),
  ]);
  const first = plan(s, { now });
  assert.equal(first.notifications.length, 1);
  s = transition(
    s,
    "captcha",
    { type: "notified", fingerprint: first.notifications[0].fingerprint },
    now,
  );
  const bytes = JSON.stringify(s);
  for (const at of [now + 3600000, now + 7200000]) {
    const p = plan(s, { now: at });
    assert.equal(p.action, "NOOP");
    assert.deepEqual(p.probes, []);
    assert.deepEqual(p.notifications, []);
  }
  assert.equal(JSON.stringify(s), bytes);
});
test("two equivalent failures suspend third and several unsupervised hours; new fingerprint reopens", () => {
  let s = make([t()]);
  s = transition(
    s,
    "a",
    event(s, "a", "FAIL", { failure: { code: "E" } }),
    now,
  );
  assert.equal(s.tasks[0].status, "RETRY_BACKOFF");
  assert.equal(plan(s, { now }).action, "NOOP");
  s = transition(
    s,
    "a",
    event(s, "a", "FAIL", { failure: { code: "E" } }),
    now + 2400000,
  );
  assert.equal(s.tasks[0].attempts_for_fingerprint, 2);
  assert.equal(s.tasks[0].next_probe_at, null);
  assert.equal(plan(s, { now: now + 12 * 3600000 }).action, "NOOP");
  s = transition(
    s,
    "a",
    { type: "inputs", inputs: { sha: "b".repeat(40), contract: "v1" } },
    now + 13 * 3600000,
  );
  assert.equal(plan(s, { now: now + 13 * 3600000 }).action, "EXECUTE");
  assert.equal(s.tasks[0].attempts_for_fingerprint, 0);
});
test("PASS reused only with exact input SHA/contract/scope; new SHA never inherits PASS", () => {
  let s = make([t()]);
  s = transition(
    s,
    "a",
    event(s, "a", "PASS", { evidence_sha: "proof", scope: "focused" }),
    now,
  );
  assert.equal(needsProof(s.tasks[0], "focused"), false);
  assert.equal(needsProof(s.tasks[0], "other"), true);
  assert.equal(
    transition(
      s,
      "a",
      { type: "inputs", inputs: s.tasks[0].inputs },
      now + 999,
    ),
    s,
  );
  s = transition(
    s,
    "a",
    { type: "inputs", inputs: { sha: "b".repeat(40), contract: "v1" } },
    now,
  );
  assert.equal(needsProof(s.tasks[0], "focused"), true);
  assert.equal(s.tasks[0].status, "READY");
  assert.throws(
    () =>
      transition(
        s,
        "a",
        { ...event(s, "a", "PASS"), sha: "a".repeat(40) },
        now,
      ),
    /STALE_EVIDENCE/,
  );
});
test("CI only probes when due; progressive capped backoff; human never polled", () => {
  let s = make([
    t("ci", {
      status: "WAIT_CI",
      probe: { kind: "github-run" },
      next_probe_at: new Date(now + 1000).toISOString(),
    }),
    t("human", { status: "WAIT_HUMAN" }),
  ]);
  assert.deepEqual(plan(s, { now }).probes, []);
  assert.deepEqual(plan(s, { now: now + 1000 }).probes, ["ci"]);
  for (let i = 0; i < 8; i++)
    s = transition(s, "ci", event(s, "ci", "PENDING"), now);
  assert.equal(Date.parse(s.tasks[0].next_probe_at) - now, 6 * 3600000);
  assert.equal(s.tasks[0].last_material_change, null);
});
test("dependency evidence is mandatory and cycles/forged DONE refused", () => {
  assert.equal(
    plan(
      make([t("a", { status: "WAIT_CI" }), t("b", { dependencies: ["a"] })]),
      { now },
    ).selected,
    null,
  );
  assert.throws(
    () =>
      validate(
        make([
          t("a", { dependencies: ["b"] }),
          t("b", { dependencies: ["a"] }),
        ]),
      ),
    /CYCLE/,
  );
  assert.throws(
    () =>
      validate(
        make([t("a", { status: "DONE", evidence_sha: "a".repeat(40) })]),
      ),
    /UNPROVEN/,
  );
});
test("all protected operations stay prohibited, even if marked READY", () => {
  for (const action of PROTECTED) {
    const s = make([t("a", { action })]);
    assert.equal(plan(s, { now }).selected, null);
    assert.throws(
      () =>
        transition(
          s,
          "a",
          { type: "claim", lock_owner: "x", owner_id: "x" },
          now,
        ),
      /DENIED/,
    );
  }
});
test("RUNNING ownership, crash reconciliation and uncertain remote operation are idempotent", () => {
  let s = make([t()]);
  s = transition(
    s,
    "a",
    { type: "claim", owner_id: "run", lock_owner: "run" },
    now,
  );
  s = transition(
    s,
    "a",
    {
      type: "operation-intent",
      owner_id: "run",
      operation_id: "push-1",
      action: "normal-code-push",
      expected_sha: "a".repeat(40),
    },
    now,
  );
  assert.equal(plan(s, { now: now + 9 * 3600000 }).action, "RECONCILE");
  assert.throws(
    () =>
      transition(
        s,
        "a",
        event(s, "a", "PASS", {
          owner_id: "run",
          scope: "proof",
          evidence_sha: "p",
        }),
        now,
      ),
    /RECONCILE/,
  );
  assert.throws(
    () => transition(s, "a", { type: "inputs", inputs: { sha: "b" } }, now),
    /RECONCILE/,
  );
  assert.throws(
    () =>
      transition(
        s,
        "a",
        {
          type: "operation-intent",
          owner_id: "run",
          operation_id: "push-1",
          action: "normal-code-push",
        },
        now,
      ),
    /DENIED/,
  );
  s = transition(
    s,
    "a",
    {
      type: "reconcile-operation",
      operation_id: "push-1",
      expected_sha: "a".repeat(40),
      result: "APPLIED",
      evidence_sha: "remote-readback",
    },
    now,
  );
  s = transition(
    s,
    "a",
    event(s, "a", "PASS", {
      owner_id: "run",
      evidence_sha: "proof",
      scope: "local proof",
    }),
    now,
  );
  assert.equal(s.tasks[0].status, "DONE");
});
test("V1 migration is reversible and preserves every preexisting gate/evidence", () => {
  const v1 = {
    format: "V1",
    authorization: { sensitive: false },
    dependencies: ["CAPTCHA"],
    evidence: { sha: "old" },
  };
  assert.deepEqual(exportV1(migrateV1(v1, [t()])), v1);
  assert.deepEqual(migrateV1(migrateV1(v1, [t()]), []), migrateV1(v1, [t()]));
});
test("active other lock and unknown orphan produce zero writes and never delete owner", () => {
  const f = fixture([t()]);
  try {
    const owner = acquireLock(f.ctx.common, "other");
    assert(owner);
    const file = path.join(f.ctx.common, "comun-roadmap-cycle.lock/owner.json");
    const bytes = fs.readFileSync(file);
    assert.equal(inspectLock(f.ctx.common).state, "HELD_LIVE");
    assert.equal(tick(f.ctx, { now }).reason, "HELD_LIVE");
    assert(!fs.existsSync(f.ctx.ledger));
    assert.equal(releaseLock(f.ctx.common, "wrong"), false);
    assert.deepEqual(fs.readFileSync(file), bytes);
    fs.writeFileSync(
      file,
      JSON.stringify({ id: "unknown", pid: -1, machine: os.hostname() }),
    );
    assert.equal(tick(f.ctx, { now }).reason, "ORPHAN_UNKNOWN");
    assert(!fs.existsSync(f.ctx.ledger));
    assert(fs.existsSync(file));
    releaseLock(f.ctx.common, "unknown");
  } finally {
    f.cleanup();
  }
});
test("two real blocked ticks create no commits/worktrees/reports or second ledger write", () => {
  const f = fixture([
    t("human", { status: "WAIT_HUMAN", human_action_required: "CAPTCHA" }),
  ]);
  try {
    const head = f.git("rev-parse", REF);
    const worktrees = f.git("worktree", "list", "--porcelain");
    const first = tick(f.ctx, { now });
    assert.equal(first.notifications.length, 1);
    const bytes = fs.readFileSync(f.ctx.ledger);
    const mtime = fs.statSync(f.ctx.ledger).mtimeMs;
    for (const at of [now + 3600000, now + 7200000]) {
      const p = tick(f.ctx, { now: at });
      assert.equal(p.action, "NOOP");
      assert.equal(p.worktrees, 0);
      assert.equal(p.writes, 0);
      assert.equal(p.notify, false);
    }
    assert.deepEqual(fs.readFileSync(f.ctx.ledger), bytes);
    assert.equal(fs.statSync(f.ctx.ledger).mtimeMs, mtime);
    assert.equal(f.git("rev-parse", REF), head);
    assert.equal(f.git("worktree", "list", "--porcelain"), worktrees);
    assert.equal(f.git("status", "--porcelain"), "");
  } finally {
    f.cleanup();
  }
});
test("real due CI probe persists backoff; immediate repeat makes zero network calls", () => {
  const f = fixture([
    t("ci", {
      status: "WAIT_CI",
      probe: { kind: "github-run" },
      next_probe_at: new Date(now).toISOString(),
    }),
  ]);
  let calls = 0;
  const probe = (t) => {
    calls++;
    return {
      result: "PENDING",
      sha: t.inputs.sha,
      input_fingerprint: t.input_fingerprint,
    };
  };
  try {
    tick(f.ctx, { now, probe });
    tick(f.ctx, { now: now + 1000, probe });
    assert.equal(calls, 1);
    assert.equal(loadState(f.ctx).state.tasks[0].status, "WAIT_CI");
  } finally {
    f.cleanup();
  }
});
test("CAS conflict preserves losing candidate stable ref and never overwrites winner", () => {
  const f = fixture([t("a", { status: "WAIT_HUMAN" })]);
  try {
    const old = f.git("rev-parse", REF);
    fs.writeFileSync(path.join(f.repo, "candidate.txt"), "candidate");
    f.git("add", ".");
    f.git("commit", "-m", "candidate");
    const candidate = f.git("rev-parse", "HEAD");
    fs.writeFileSync(path.join(f.repo, "winner.txt"), "winner");
    f.git("add", ".");
    f.git("commit", "-m", "winner");
    const winner = f.git("rev-parse", "HEAD");
    f.git("update-ref", REF, winner, old);
    assert.throws(() =>
      canonicalCAS(f.repo, candidate, old, "refs/comun/test-loser"),
    );
    assert.equal(f.git("rev-parse", REF), winner);
    assert.equal(f.git("rev-parse", "refs/comun/test-loser"), candidate);
  } finally {
    f.cleanup();
  }
});
test("atomic ledger CAS rejects stale writer without changing saved bytes", () => {
  const f = fixture([t()]);
  try {
    atomicJson(f.ctx.ledger, { revision: 1 });
    const bytes = fs.readFileSync(f.ctx.ledger);
    assert.throws(
      () => atomicJson(f.ctx.ledger, { revision: 2 }, hash("stale")),
      /CAS/,
    );
    assert.deepEqual(fs.readFileSync(f.ctx.ledger), bytes);
  } finally {
    f.cleanup();
  }
});
test("material budget already consumed: select next independently but do not create a worktree", () => {
  const f = fixture([t()]);
  try {
    const p = tick(f.ctx, { now, material_budget: 0 });
    assert.equal(p.action, "NOOP");
    assert.equal(p.selected, "a");
    assert.equal(p.reason, "CYCLE_MATERIAL_BUDGET_CONSUMED");
    assert.equal(p.worktrees, 0);
  } finally {
    f.cleanup();
  }
});
test("controlled real delivery creates one clean detached worktree, retains ownership and completes safely", () => {
  const f = fixture([t()]);
  let p;
  try {
    p = tick(f.ctx, {
      now,
      worktreeRoot: path.join(f.ctx.common, "test-cycles"),
    });
    assert.equal(p.action, "EXECUTE");
    assert.equal(p.worktrees, 1);
    assert.equal(inspectLock(f.ctx.common).owner_id, p.owner_id);
    assert.equal(
      execFileSync("git", ["-C", p.worktree, "status", "--porcelain"], {
        encoding: "utf8",
      }).trim(),
      "",
    );
    const s = loadState(f.ctx).state;
    assert.throws(
      () =>
        record(f.ctx, {
          owner_id: "other",
          task_id: "a",
          event: event(s, "a", "PASS"),
        }),
      /OWNER/,
    );
    record(f.ctx, {
      owner_id: p.owner_id,
      task_id: "a",
      event: event(s, "a", "PASS", {
        evidence_sha: hash("controlled proof"),
        scope: "controlled",
      }),
      now,
    });
    assert.equal(inspectLock(f.ctx.common).state, "FREE");
    assert.equal(loadState(f.ctx).state.tasks[0].status, "DONE");
    assert.equal(tick(f.ctx, { now: now + 3600000 }).action, "NOOP");
  } finally {
    if (p?.worktree) f.git("worktree", "remove", p.worktree);
    f.cleanup();
  }
});
test("new committed candidate keeps ownership and invalidates proof instead of relabeling old PASS", () => {
  let s = make([t()]);
  s = transition(
    s,
    "a",
    { type: "claim", owner_id: "x", lock_owner: "x" },
    now,
  );
  s = transition(
    s,
    "a",
    { type: "candidate", owner_id: "x", sha: "b".repeat(40) },
    now,
  );
  assert.equal(s.tasks[0].owner_id, "x");
  assert.equal(s.tasks[0].status, "RUNNING");
  assert.equal(needsProof(s.tasks[0], "focused"), true);
  assert.throws(
    () =>
      transition(
        s,
        "a",
        { ...event(s, "a", "PASS"), sha: "a".repeat(40) },
        now,
      ),
    /STALE/,
  );
});
test("human event needs every existing proof; clearing it never authorizes protected migration", () => {
  let s = make([
    t("human", {
      status: "WAIT_HUMAN",
      proof_requirements: ["captcha", "five-flows"],
      human_action_required: "Human proof",
    }),
    t("migration", {
      action: "migration",
      status: "BLOCKED_PROTECTED",
      dependencies: ["human"],
    }),
  ]);
  assert.throws(
    () =>
      transition(
        s,
        "human",
        {
          type: "human-cleared",
          source: "human-message",
          evidence_sha: "proof",
          proofs: [
            { requirement: "captcha", result: "PASS", sha: "a".repeat(40) },
          ],
        },
        now,
      ),
    /HUMAN_PROOF/,
  );
  s = transition(
    s,
    "human",
    {
      type: "human-cleared",
      source: "human-message",
      evidence_sha: "proof",
      proofs: ["captcha", "five-flows"].map((requirement) => ({
        requirement,
        result: "PASS",
        sha: "a".repeat(40),
      })),
    },
    now,
  );
  assert.equal(s.tasks[0].status, "DONE");
  assert.equal(plan(s, { now }).action, "NOOP");
  assert.equal(s.tasks[1].status, "BLOCKED_PROTECTED");
});
