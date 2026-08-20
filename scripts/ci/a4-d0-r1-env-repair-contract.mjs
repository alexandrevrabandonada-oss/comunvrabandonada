import crypto from "node:crypto";
import fs from "node:fs";

export const A4_KEY = "COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED";
export const A3_KEY = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";

export function fingerprint(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function rows(payload) {
  return Array.isArray(payload?.envs) ? payload.envs : Array.isArray(payload?.data) ? payload.data : [];
}

function valueState(env, key) {
  const line = String(env ?? "").split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
  if (!line) return "ABSENT";
  const value = line.slice(key.length + 1).replace(/^"|"$/g, "");
  if (value === "enabled") return "ON";
  if (value === "disabled") return "OFF";
  return "UNKNOWN";
}

function productionRows(payload, key) {
  return rows(payload).filter((row) => row?.key === key && Array.isArray(row.target) && row.target.includes("production"));
}

function assertExactProductionRow(row, key) {
  if (!Array.isArray(row.target) || row.target.length !== 1 || row.target[0] !== "production") throw new Error(`${key}_TARGET_NOT_EXACT_PRODUCTION`);
  if (row.gitBranch !== null && row.gitBranch !== undefined) throw new Error(`${key}_BRANCH_OVERRIDE`);
  if (Array.isArray(row.customEnvironmentIds) && row.customEnvironmentIds.length !== 0) throw new Error(`${key}_CUSTOM_ENV_OVERRIDE`);
}

function sanitizedRow(row) {
  return {
    id: fingerprint(row?.id),
    key: row?.key === A4_KEY || row?.key === A3_KEY ? row.key : "OTHER",
    type: typeof row?.type === "string" ? row.type : null,
    target: Array.isArray(row?.target) ? row.target : [],
    gitBranch: row?.gitBranch ?? null,
    customEnvironmentIds: Array.isArray(row?.customEnvironmentIds) ? row.customEnvironmentIds.map(fingerprint) : [],
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    createdBy: fingerprint(row?.createdBy),
    updatedBy: fingerprint(row?.updatedBy),
    sourceType: "project",
  };
}

export function parseSensitivePolicy(team) {
  const candidates = [
    team?.sensitiveEnvironmentVariablePolicy,
    team?.sensitiveEnvironmentVariablesPolicy,
    team?.enforceSensitiveEnvironmentVariables,
    team?.settings?.sensitiveEnvironmentVariablePolicy,
    team?.settings?.enforceSensitiveEnvironmentVariables,
  ];
  for (const candidate of candidates) {
    if (candidate === true || candidate === "enabled" || candidate === "enforced") return "enabled";
    if (candidate === false || candidate === "disabled" || candidate === "off") return "disabled";
  }
  return "unknown";
}

export function inspect({ project, shared, envFile, team }) {
  const projectRows = rows(project);
  const sharedRows = rows(shared).filter((row) => row?.key === A4_KEY);
  const a4Rows = productionRows(project, A4_KEY);
  const a3Rows = productionRows(project, A3_KEY);
  const env = fs.readFileSync(envFile, "utf8");
  return {
    a4: { valueState: valueState(env, A4_KEY), projectMatches: a4Rows.map(sanitizedRow), sharedMatches: sharedRows.length },
    a3: { valueState: valueState(env, A3_KEY), projectMatches: a3Rows.map(sanitizedRow), sharedMatches: rows(shared).filter((row) => row?.key === A3_KEY).length },
    teamSensitivePolicy: parseSensitivePolicy(team),
    rawValuePersisted: false,
    tokenPersisted: false,
  };
}

export function assertRepairPreconditions(input) {
  const view = inspect(input);
  const a4Rows = productionRows(input.project, A4_KEY);
  const a3Rows = productionRows(input.project, A3_KEY);
  if (a4Rows.length !== 1) throw new Error("A4_D0_R1_A4_PRODUCTION_NOT_UNIQUE");
  if (view.a4.sharedMatches !== 0) throw new Error("A4_D0_R1_A4_SHARED_CONFLICT");
  assertExactProductionRow(a4Rows[0], A4_KEY);
  if (a4Rows[0].type !== "sensitive") throw new Error("A4_D0_R1_A4_EXPECTED_SENSITIVE");
  if (a3Rows.length !== 1 || view.a3.sharedMatches !== 0) throw new Error("A4_D0_R1_A3_NOT_CANONICAL");
  assertExactProductionRow(a3Rows[0], A3_KEY);
  if (a3Rows[0].type !== "encrypted" || view.a3.valueState !== "ON") throw new Error("A4_D0_R1_A3_NOT_INTACT");
  return { ...view, transition: "OPAQUE_SENSITIVE_TO_ENCRYPTED_DISABLED" };
}

export function repairPayload() {
  return { key: A4_KEY, type: "encrypted", value: "disabled", target: ["production"] };
}

export function sanitizePatchResult({ status, payload, headers = "" }) {
  const number = Number(status);
  const error = payload && typeof payload === "object" ? payload.error ?? payload : {};
  const safe = (value) => typeof value === "string" ? value.replace(/(?:Bearer\s+)?[A-Za-z0-9_-]{24,}/g, "[redacted]").slice(0, 240) : null;
  return {
    httpStatus: Number.isInteger(number) ? number : null,
    errorCode: safe(error.code),
    errorMessage: safe(error.message),
    errorAction: safe(error.action),
    requestId: safe(String(headers).match(/^(?:x-vercel-id|x-request-id):\s*(.+)$/im)?.[1]?.trim()),
    contentType: safe(String(headers).match(/^content-type:\s*(.+)$/im)?.[1]?.trim()),
    payloadShape: ["key", "type", "value", "target"],
    successful: number === 200,
    rawValuePersisted: false,
    tokenPersisted: false,
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [projectFile, sharedFile, envFile, teamFile, output] = process.argv.slice(2);
  const result = inspect({
    project: JSON.parse(fs.readFileSync(projectFile, "utf8")),
    shared: JSON.parse(fs.readFileSync(sharedFile, "utf8")),
    envFile,
    team: JSON.parse(fs.readFileSync(teamFile, "utf8")),
  });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
}
