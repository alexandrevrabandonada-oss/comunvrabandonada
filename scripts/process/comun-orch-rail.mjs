// Single-track progress over the *existing* canonical roadmap_backlog.items.
// Pure, read-only and fail-closed. Neither a station nor this planner grants
// write, merge, deployment or production permissions.
const STATION_ID = /^[a-z0-9-]+$/;

function materialPass(item,t) {
  if (t.status !== "DONE" || !/^[a-f0-9]{40}$/.test(t.inputs?.sha ?? "") ||
      t.evidence_sha !== t.inputs.sha || !Array.isArray(t.evidence) ||
      !t.evidence.some(e => e.result === "PASS" && e.sha === t.inputs.sha &&
        e.input_fingerprint === t.input_fingerprint) || !Array.isArray(t.operations)) return false;
  const kind=item.completion_kind??"CODE_PUSH";
  if(kind==="CODE_PUSH")return t.operations.some(op=>op.action==="normal-code-push" &&
    op.state==="APPLIED" && op.expected_sha===t.inputs.sha &&
    /^[a-f0-9]{64}$/.test(op.evidence_sha??""));
  if(kind==="MERGED_PR")return t.action==="integrate-existing-pr" &&
    t.pr_effect==="EXISTING_PR" && t.target_pr===item.target_pr &&
    t.inputs.sha===item.sha && t.operations.some(op=>op.action==="merge-pr" &&
      op.state==="APPLIED" && op.expected_sha===t.inputs.sha &&
      /^[a-f0-9]{40}$/.test(op.merge_commit_sha??"") &&
      /^[a-f0-9]{64}$/.test(op.evidence_sha??"") &&
      t.evidence.some(e=>e.evidence_sha===op.merge_commit_sha));
  if(kind==="HUMAN_GATE"){
    const h=t.human_clearance;
    return h?.source==="human-message" && h.sha===t.inputs.sha &&
      /^[a-f0-9]{64}$/.test(h.evidence_sha??"") &&
      Array.isArray(h.requirements) && Array.isArray(t.proof_requirements) &&
      h.requirements.length===item.proof_requirements.length &&
      h.requirements.length===t.proof_requirements.length &&
      item.proof_requirements.every(x=>h.requirements.includes(x)&&t.proof_requirements.includes(x)) &&
      t.evidence.some(e=>e.evidence_sha===h.evidence_sha);
  }
  return false;
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
    ids.some(id => !items.some(x => x.task_id === id)) ||
    items.some(item => !["CODE_PUSH","MERGED_PR","HUMAN_GATE"].includes(
      item.completion_kind??"CODE_PUSH") ||
      (item.completion_kind==="MERGED_PR" &&
        (!Number.isSafeInteger(item.target_pr) || item.target_pr<1 ||
          !/^[a-f0-9]{40}$/.test(item.sha??""))) ||
      (item.completion_kind==="HUMAN_GATE" &&
        (!Array.isArray(item.proof_requirements) || !item.proof_requirements.length ||
          item.proof_requirements.some(x=>typeof x!=="string"||!x.trim()) ||
          new Set(item.proof_requirements).size!==item.proof_requirements.length))))
      throw Error("ROADMAP_RAIL_INVALID");
  for (const [index, id] of ids.entries()) {
    const item = items.find(x => x.task_id === id);
    const matching = state.tasks.filter(t => t.roadmap_item === id ||
      t.task_id === id);
    if (matching.length > 1) throw Error("ROADMAP_RAIL_DUPLICATE_ADMISSION");
    const t = matching[0];
    const common = {station_id: id, index, total: ids.length};
    if (t?.status === "DONE") {
      if (!materialPass(item,t)) return {...common, reason: "ROADMAP_RAIL_PROOF_REQUIRED", item: null};
      continue;
    }
    if (t) return {...common, reason: "ROADMAP_RAIL_STATION_ACTIVE",
      active_status: t.status, item: null};
    if(item.completion_kind==="HUMAN_GATE"||item.completion_kind==="MERGED_PR")
      return {...common,reason:"ROADMAP_RAIL_EXTERNAL_GATE",item:null};
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
  const active = state.tasks.find(t=>t.roadmap_item===rail.station_id ||
    t.task_id===rail.station_id);
  return {rail, state: {...state, tasks: state.tasks.map(t => {
    const parent = rail.station_id!==null &&
      (t.roadmap_item===rail.station_id||t.task_id===rail.station_id);
    const repair = rail.station_id!==null && active &&
      t.rail_station===rail.station_id && t.rail_source_sha===active.inputs?.sha &&
      t.target_pr===active.target_pr && t.inputs?.sha===active.inputs?.sha &&
      t.pr_effect==="EXISTING_PR" && t.discovery?.pr===active.target_pr &&
      t.discovery?.source_sha===active.inputs?.sha &&
      ["PRETTIER_TEST_ONLY","TSC_SCOPED_FIX"].includes(t.discovery?.recipe);
    return t.status==="RUNNING"||parent||repair ? t : {...t,authorized:false};
  })}};
}
