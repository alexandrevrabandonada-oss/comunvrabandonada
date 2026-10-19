// Single-track progress over the *existing* canonical roadmap_backlog.items.
// Pure, read-only and fail-closed. Neither a station nor this planner grants
// write, merge, deployment or production permissions.
const STATION_ID = /^[a-z0-9-]+$/;

function materialPass(t) {
  if (t.status !== "DONE" || !/^[a-f0-9]{40}$/.test(t.inputs?.sha ?? "") ||
      t.evidence_sha !== t.inputs.sha || !Array.isArray(t.evidence) ||
      !t.evidence.some(e => e.result === "PASS" && e.sha === t.inputs.sha &&
        e.input_fingerprint === t.input_fingerprint) || !Array.isArray(t.operations)) return false;
  return t.operations.some(op => op.action === "normal-code-push" &&
    op.state === "APPLIED" && op.expected_sha === t.inputs.sha &&
    /^[a-f0-9]{64}$/.test(op.evidence_sha ?? ""));
}

export function selectRailStation(backlog, state, {required = false} = {}) {
  const rail = backlog?.rail;
  if (rail === undefined || rail === null) {
    return {reason: required ? "ROADMAP_RAIL_REQUIRED" : "ROADMAP_RAIL_LEGACY",
      item: null, station_id: null, index: null, total: 0};
  }
  const ids = rail.station_ids;
  const items = backlog?.items;
  if (rail.version !== 1 || rail.mode !== "SINGLE_TRACK" ||
    rail.completion_policy !== "MATERIAL_AND_PASS" ||
    !Array.isArray(ids) || ids.length === 0 || ids.length > 100 ||
    !Array.isArray(items) || !Array.isArray(state?.tasks) ||
    new Set(ids).size !== ids.length || ids.some(x => typeof x !== "string" || !STATION_ID.test(x)) ||
    new Set(items.map(x => x.task_id)).size !== items.length ||
    ids.some(id => !items.some(x => x.task_id === id))) throw Error("ROADMAP_RAIL_INVALID");
  for (const [index, id] of ids.entries()) {
    const item = items.find(x => x.task_id === id);
    const matching = state.tasks.filter(t => t.roadmap_item === id ||
      t.task_id === id);
    if (matching.length > 1) throw Error("ROADMAP_RAIL_DUPLICATE_ADMISSION");
    const t = matching[0];
    const common = {station_id: id, index, total: ids.length};
    if (t?.status === "DONE") {
      if (!materialPass(t)) return {...common, reason: "ROADMAP_RAIL_PROOF_REQUIRED", item: null};
      continue;
    }
    if (t) return {...common, reason: "ROADMAP_RAIL_STATION_ACTIVE",
      active_status: t.status, item: null};
    if (item.status !== "READY") return {...common,
      reason: "ROADMAP_RAIL_STATION_NOT_READY", item: null};
    return {...common, reason: "ROADMAP_RAIL_STATION_READY", item};
  }
  return {reason: "ROADMAP_RAIL_COMPLETE", station_id: null,
    index: ids.length, total: ids.length, item: null};
}

export function scopeRailTasks(backlog, state, {required = false} = {}) {
  const rail = selectRailStation(backlog, state, {required});
  if (rail.reason === "ROADMAP_RAIL_LEGACY") return {rail, state};
  return {rail, state: {...state, tasks: state.tasks.map(t =>
    t.status === "RUNNING" || (rail.station_id !== null &&
      (t.roadmap_item === rail.station_id || t.task_id === rail.station_id))
      ? t : {...t, authorized: false})}};
}
