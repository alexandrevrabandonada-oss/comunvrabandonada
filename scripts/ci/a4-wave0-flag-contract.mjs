import crypto from "node:crypto";
import fs from "node:fs";

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

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function readEnv(path) {
  const result = new Map();
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replaceAll('\\"', '"');
    result.set(match[1], value);
  }
  return result;
}

function state(value) {
  if (value === "enabled") return "ON";
  if (value === "disabled") return "OFF";
  if (value === undefined || value === "") return "ABSENT";
  return "UNKNOWN";
}

function metadata(row) {
  return {
    id: fingerprint(row?.id),
    target: Array.isArray(row?.target) ? row.target : [],
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    gitBranch: row?.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(row?.customEnvironmentIds) ? row.customEnvironmentIds.map(fingerprint) : [],
    sourceType: "project",
  };
}

function auditKey({ key, projectRows, sharedRows, env, expectedState }) {
  const projectMatches = projectRows.filter((row) => row?.key === key);
  const production = projectMatches.filter((row) => Array.isArray(row?.target) && row.target.includes("production"));
  const sharedMatches = sharedRows.filter((row) => row?.key === key);
  if (production.length === 0) throw new Error(`${key}_PRODUCTION_ENV_ABSENT`);
  if (production.length > 1) throw new Error(`${key}_PRODUCTION_ENV_DUPLICATE`);
  if (sharedMatches.length > 0) throw new Error(`${key}_SHARED_ENV_CONFLICT`);
  const productionRow = production[0];
  if (productionRow.gitBranch !== null && productionRow.gitBranch !== undefined) throw new Error(`${key}_PRODUCTION_BRANCH_OVERRIDE`);
  if (Array.isArray(productionRow.customEnvironmentIds) && productionRow.customEnvironmentIds.length > 0) throw new Error(`${key}_PRODUCTION_CUSTOM_ENV_OVERRIDE`);
  const valueState = state(env.get(key));
  if (valueState === "UNKNOWN") throw new Error(`${key}_VALUE_STATE_UNKNOWN`);
  if (expectedState && valueState !== expectedState) throw new Error(`${key}_EXPECTED_${expectedState}_GOT_${valueState}`);
  return {
    key,
    production: { ...metadata(productionRow), valueState },
    allProjectTargets: projectMatches.map(metadata),
    sharedCount: sharedMatches.length,
  };
}

export function auditA4Wave0Flags({ project, shared, env, output }) {
  const projectRows = rows(project);
  const sharedRows = rows(shared);
  const a4 = auditKey({ key: A4_FLAG_KEY, projectRows, sharedRows, env, expectedState: "OFF" });
  const a3 = auditKey({ key: A3_FLAG_KEY, projectRows, sharedRows, env, expectedState: "ON" });
  const result = {
    formatVersion: 1,
    phase: "wave0-read-only-audit",
    a4,
    a3,
    secretsPersisted: false,
    valuesPersisted: false,
  };
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

if (process.argv[1]?.endsWith("a4-wave0-flag-contract.mjs")) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1]);
  const result = auditA4Wave0Flags({
    project: readJson(args.get("--project-json")),
    shared: readJson(args.get("--shared-json")),
    env: readEnv(args.get("--env-file")),
    output: args.get("--output"),
  });
  console.log(`COMUN_48_5_A4_WAVE0_FLAG_AUDIT_GREEN a4=${result.a4.production.valueState} a3=${result.a3.production.valueState}`);
}
