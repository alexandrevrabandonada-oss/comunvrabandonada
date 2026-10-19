import test from "node:test";
import assert from "node:assert/strict";
import {selectRailStation,scopeRailTasks} from "./comun-orch-rail.mjs";
import {hash} from "./comun-orch-v2.mjs";

const A = "a".repeat(40), B = "b".repeat(40);
const items = () => [
  {task_id: "first", status: "READY", sha: A},
  {task_id: "second", status: "READY", sha: B},
  {task_id: "third", status: "READY", sha: A},
];
const track = entries => ({items: entries, rail: {version: 1,
  mode: "SINGLE_TRACK", completion_policy: "MATERIAL_AND_PASS",
  station_ids: ["first", "second", "third"]}});
const state = tasks => ({tasks});
function completed(id) {
  const inputs = {sha: id === "second" ? B : A};
  return {roadmap_item: id, task_id: id, status: "DONE", inputs,
    input_fingerprint: hash(inputs), evidence_sha: inputs.sha,
    evidence: [{result: "PASS", sha: inputs.sha, input_fingerprint: hash(inputs)}],
    operations: [{action: "normal-code-push", state: "APPLIED",
      expected_sha: inputs.sha, evidence_sha: hash(id)}]};
}

test("one track admits the first station only, never the lowest priority elsewhere", () => {
  const p = selectRailStation(track(items()), state([]), {required: true});
  assert.equal(p.reason, "ROADMAP_RAIL_STATION_READY");
  assert.equal(p.item.task_id, "first");
  assert.deepEqual([p.index, p.total], [0, 3]);
});
test("no green tests can skip an active or blocked station", () => {
  for (const status of ["READY", "RUNNING", "WAIT_CI", "WAIT_EXTERNAL", "WAIT_HUMAN",
    "RETRY_BACKOFF", "BLOCKED_PROTECTED"]) {
    const p = selectRailStation(track(items()), state([{task_id: "first",
      roadmap_item: "first", status}]), {required: true});
    assert.equal(p.reason, "ROADMAP_RAIL_STATION_ACTIVE");
    assert.equal(p.station_id, "first");
    assert.equal(p.item, null);
  }
  const unready = items(); unready[0].status = "BLOCKED";
  assert.equal(selectRailStation(track(unready), state([]), {required: true}).reason,
    "ROADMAP_RAIL_STATION_NOT_READY");
});
test("verified material completion advances exactly one station", () => {
  const p = selectRailStation(track(items()), state([completed("first")]));
  assert.equal(p.item.task_id, "second");
  assert.deepEqual([p.index, p.total], [1, 3]);
  const q = selectRailStation(track(items()), state([completed("first"),completed("second")]));
  assert.equal(q.item.task_id, "third");
  assert.equal(selectRailStation(track(items()), state([
    completed("first"), completed("second"), completed("third")])).reason,
    "ROADMAP_RAIL_COMPLETE");
});
test("unit tests or a bare DONE alone never count as delivery", () => {
  const noPush = completed("first"); noPush.operations = [];
  assert.equal(selectRailStation(track(items()), state([noPush])).reason,
    "ROADMAP_RAIL_PROOF_REQUIRED");
  const notApplied = completed("first"); notApplied.operations[0].state = "UNCERTAIN";
  assert.equal(selectRailStation(track(items()), state([notApplied])).reason,
    "ROADMAP_RAIL_PROOF_REQUIRED");
  const stalePass = completed("first"); stalePass.evidence[0].sha = B;
  assert.equal(selectRailStation(track(items()), state([stalePass])).reason,
    "ROADMAP_RAIL_PROOF_REQUIRED");
});
test("missing rail is explicit, never silently invented under standing policy", () => {
  assert.equal(selectRailStation({items: items()}, state([]), {required: true}).reason,
    "ROADMAP_RAIL_REQUIRED");
  assert.equal(selectRailStation({items: items()}, state([])).reason,
    "ROADMAP_RAIL_LEGACY");
});
test("rail fails closed when station IDs are missing, repeated, malformed or reordered ambiguously", () => {
  for (const ids of [[], ["first", "first"], ["first", "missing"],
    ["first", "../private"], ["first", 3]]) {
    const backlog = track(items()); backlog.rail.station_ids = ids;
    assert.throws(() => selectRailStation(backlog, state([])), /ROADMAP_RAIL_INVALID/);
  }
  const missing = track(items()); missing.rail.mode = "MULTI_TRACK";
  assert.throws(() => selectRailStation(missing, state([])), /ROADMAP_RAIL_INVALID/);
});
test("duplicate operational admissions never advance a station", () => {
  const duplicated = [completed("first"), {...completed("first"), task_id: "other"}];
  assert.throws(() => selectRailStation(track(items()), state(duplicated)),
    /ROADMAP_RAIL_DUPLICATE_ADMISSION/);
});

test("single-track masks unrelated READY tasks without modifying live ledger state", () => {
  const first = {roadmap_item: "first", task_id: "first", status: "READY", authorized: true};
  const other = {roadmap_item: "second", task_id: "second", status: "READY", authorized: true};
  const original = state([first,other]);
  const scoped = scopeRailTasks(track(items()), original);
  assert.equal(scoped.rail.reason, "ROADMAP_RAIL_STATION_ACTIVE");
  assert.equal(scoped.state.tasks[0].authorized, true);
  assert.equal(scoped.state.tasks[1].authorized, false);
  assert.equal(original.tasks[1].authorized, true);
});
test("no valid track blocks unrelated READY work when permanent mandate requires rail", () => {
  const original = state([{task_id:"external", status:"READY", authorized:true}]);
  const scoped = scopeRailTasks({items:items()},original,{required:true});
  assert.equal(scoped.rail.reason, "ROADMAP_RAIL_REQUIRED");
  assert.equal(scoped.state.tasks[0].authorized, false);
});
