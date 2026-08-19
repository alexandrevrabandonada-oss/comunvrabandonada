import crypto from "node:crypto";
import fs from "node:fs";

export const A3_FLAG_WRITER_ID = "comun-48-5-a3-r2";
export const A3_FLAG_KEY = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";

export function fingerprint(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export function assertA3Transition({ mode, currentState, desiredState }) {
  const current = String(currentState ?? "").toUpperCase();
  const desired = String(desiredState ?? "").toLowerCase();
  if (!["ON", "OFF", "ABSENT"].includes(current)) throw new Error("A3_FLAG_CURRENT_STATE_UNKNOWN");
  if (mode === "rollout" && desired === "enabled" && !["ON"].includes(current)) return { current, desired, allowed: true };
  if (mode === "disable-only" && desired === "disabled" && ["ON", "OFF"].includes(current)) return { current, desired, allowed: true };
  throw new Error(`A3_FLAG_TRANSITION_BLOCKED:${mode}:${current}:${desired}`);
}

export function assertA3MetadataOwnership({ projectRows, sharedRows }) {
  const projectMatches = (projectRows ?? []).filter(
    (row) => row?.key === A3_FLAG_KEY && Array.isArray(row.target) && row.target.includes("production"),
  );
  const sharedMatches = (sharedRows ?? []).filter((row) => row?.key === A3_FLAG_KEY);
  if (projectMatches.length > 1) throw new Error("A3_FLAG_DUPLICATE_PRODUCTION_ENV");
  if (sharedMatches.length > 0) throw new Error("A3_FLAG_SHARED_ENV_CONFLICT");
  return {
    projectEnvId: projectMatches.length === 1 ? fingerprint(projectMatches[0].id) : null,
    projectEnvCount: projectMatches.length,
    sharedEnvCount: sharedMatches.length,
  };
}

export function createA3WriteReceipt({ mode, currentState, desiredState, envId, runId, sha, phase }) {
  const transition = assertA3Transition({ mode, currentState, desiredState });
  return {
    formatVersion: 1,
    writer: A3_FLAG_WRITER_ID,
    key: A3_FLAG_KEY,
    mode,
    previousState: transition.current,
    desiredState: transition.desired,
    phase,
    runId: /^[0-9]+$/.test(String(runId ?? "")) ? String(runId) : null,
    sha: /^[0-9a-f]{7,64}$/i.test(String(sha ?? "")) ? String(sha) : null,
    envId: fingerprint(envId),
    rawValuePersisted: false,
    tokenPersisted: false,
  };
}

function jsonRows(file) {
  const payload = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(payload?.envs) ? payload.envs : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
}

if (process.argv[1]?.endsWith("a3-flag-writer-contract.mjs")) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const projectRows = jsonRows(args.get("--project-json"));
  const sharedRows = jsonRows(args.get("--shared-json"));
  const ownership = assertA3MetadataOwnership({ projectRows, sharedRows });
  const receipt = createA3WriteReceipt({
    mode: args.get("--mode"),
    currentState: args.get("--current-state"),
    desiredState: args.get("--desired-state"),
    envId: projectRows.find((row) => row?.key === A3_FLAG_KEY && row?.target?.includes("production"))?.id,
    runId: process.env.GITHUB_RUN_ID,
    sha: process.env.EXPECTED_MAIN_SHA,
    phase: args.get("--phase") ?? "before_write",
  });
  fs.writeFileSync(args.get("--receipt"), `${JSON.stringify({ ...receipt, ownership }, null, 2)}\n`, "utf8");
  console.log(`A3_FLAG_WRITER_CONTRACT_GREEN phase=${receipt.phase} projectEnvCount=${ownership.projectEnvCount} sharedEnvCount=${ownership.sharedEnvCount}`);
}
