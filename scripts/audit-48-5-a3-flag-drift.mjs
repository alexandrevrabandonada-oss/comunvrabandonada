import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const A3_FLAG = "COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED";
export const CANONICAL = Object.freeze({
  projectId: "prj_BNUDaIwZKzt7IQ1PZUjo8c6Ljc3X",
  teamId: "team_LBVwyK8FQMO7tA3hzVXXeumF",
});

const endpoint = (version, resource, query) =>
  `https://api.vercel.com/${version}/${resource}?${new URLSearchParams(query)}`;

export function fingerprint(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  return `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export function parsePulledValue(text, key = A3_FLAG) {
  const line = String(text ?? "")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}=`));
  if (!line) return "ABSENT";
  const value = line.slice(key.length + 1).replace(/^"|"$/g, "");
  if (value === "enabled") return "ON";
  if (value === "disabled") return "OFF";
  return "UNKNOWN";
}

function safeTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return null;
}

function sanitizeComment(comment) {
  if (typeof comment !== "string") return null;
  const managed = comment.match(/managed-by=([^\s]+).*?run=([0-9]+).*?sha=([0-9a-f]{7,64})/i);
  return managed
    ? { managedBy: managed[1], runId: managed[2], sha: managed[3] }
    : { present: true, managedBy: null };
}

function sanitizeEnvRow(row) {
  const custom = Array.isArray(row.customEnvironmentIds)
    ? row.customEnvironmentIds.map(fingerprint).filter(Boolean)
    : [];
  const targets = Array.isArray(row.target)
    ? row.target.filter((value) => typeof value === "string")
    : typeof row.target === "string"
      ? [row.target]
      : [];
  return {
    id: fingerprint(row.id),
    key: row.key,
    target: targets,
    type: typeof row.type === "string" ? row.type : null,
    gitBranch: typeof row.gitBranch === "string" ? row.gitBranch : null,
    customEnvironmentIds: custom,
    createdAt: safeTimestamp(row.createdAt ?? row.created),
    updatedAt: safeTimestamp(row.updatedAt ?? row.updated),
    comment: sanitizeComment(row.comment),
    sourceType: row.ownerId || row.projectId ? "shared-or-project-metadata" : "project-metadata",
  };
}

export function projectEnvRows(payload) {
  const rows = Array.isArray(payload?.envs)
    ? payload.envs
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : null;
  if (!rows) throw new Error("VERCEL_ENV_METADATA_INVALID");
  return rows.filter((row) => row && typeof row.key === "string");
}

function sharedEnvRows(payload) {
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : null;
  if (!rows) throw new Error("VERCEL_SHARED_ENV_METADATA_INVALID");
  return rows.filter((row) => row && typeof row.key === "string");
}

function deploymentRows(payload) {
  return Array.isArray(payload?.deployments) ? payload.deployments : [];
}

function sanitizeDeployment(row) {
  return {
    id: fingerprint(row.uid ?? row.id),
    createdAt: safeTimestamp(row.createdAt ?? row.created),
    readyState: row.readyState ?? row.state ?? null,
    source: row.source ?? null,
    githubCommitSha: row.meta?.githubCommitSha ?? null,
    creator: row.creator?.username ?? row.creator?.uid ?? null,
    urlPresent: typeof row.url === "string" && row.url.length > 0,
  };
}

function statusOf(response) {
  return response?.status ?? 599;
}

export function classifyAudit({ projectStatus, envStatus, sharedStatus, projectRows, sharedRows, productionValueState }) {
  const productionRows = projectRows.filter((row) => row.target.includes("production"));
  const duplicateProduction = productionRows.filter((row) => row.key === A3_FLAG).length > 1;
  const sharedMatches = sharedRows.filter((row) => row.key === A3_FLAG);
  const sharedConflict = sharedMatches.length > 0;
  const inconclusive = projectStatus !== 200 || envStatus !== 200 || sharedStatus !== 200 || productionValueState === "UNKNOWN";
  return {
    projectAccess: projectStatus === 200 ? "GREEN" : "BLOCKED",
    projectEnvAccess: envStatus === 200 ? "GREEN" : "BLOCKED",
    sharedEnvAccess: sharedStatus === 200 ? "GREEN" : "INCONCLUSIVE",
    duplicateProduction,
    sharedConflict,
    productionValueState,
    status: duplicateProduction || sharedConflict ? "BLOCKED_CONFLICT" : inconclusive ? "INCONCLUSIVE" : "GREEN",
  };
}

export async function auditA3FlagDrift({
  token,
  projectId = CANONICAL.projectId,
  teamId = CANONICAL.teamId,
  productionEnvText = "",
  requester = fetch,
  outputDirectory = path.resolve(".ci-artifacts/48-5-a3-r2-d1"),
} = {}) {
  if (!token) throw new Error("VERCEL_TOKEN_REQUIRED");
  if (projectId !== CANONICAL.projectId || teamId !== CANONICAL.teamId) {
    throw new Error("VERCEL_CANONICAL_BINDING_INVALID");
  }
  const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
  const get = async (url) => {
    const response = await requester(url, { method: "GET", headers });
    let payload = null;
    try { payload = await response.json(); } catch { /* status evidence is enough */ }
    return { status: statusOf(response), payload };
  };
  const [project, env, shared, deployments] = await Promise.all([
    get(endpoint("v9", `projects/${projectId}`, { teamId })),
    get(endpoint("v10", `projects/${projectId}/env`, { teamId, decrypt: "false", limit: "100" })),
    get(endpoint("v1", "env", { teamId, search: A3_FLAG, limit: "100" })),
    get(endpoint("v6", "deployments", { projectId, teamId, target: "production", limit: "100" })),
  ]);
  const rawProjectRows = env.status === 200 ? projectEnvRows(env.payload) : [];
  const rawSharedRows = shared.status === 200 ? sharedEnvRows(shared.payload) : [];
  const relevantProjectRows = rawProjectRows
    .filter((row) => row.key === A3_FLAG)
    .map(sanitizeEnvRow);
  const relevantSharedRows = rawSharedRows
    .filter((row) => row.key === A3_FLAG)
    .map(sanitizeEnvRow);
  const productionValueState = parsePulledValue(productionEnvText);
  const classification = classifyAudit({
    projectStatus: project.status,
    envStatus: env.status,
    sharedStatus: shared.status,
    projectRows: relevantProjectRows,
    sharedRows: relevantSharedRows,
    productionValueState,
  });
  const result = {
    formatVersion: 1,
    key: A3_FLAG,
    projectId: fingerprint(projectId),
    teamId: fingerprint(teamId),
    projectHttpStatus: project.status,
    projectNamePresent: typeof project.payload?.name === "string",
    environmentHttpStatus: env.status,
    sharedEnvironmentHttpStatus: shared.status,
    deploymentsHttpStatus: deployments.status,
    productionValueState,
    projectEnvMatches: relevantProjectRows,
    sharedEnvMatches: relevantSharedRows,
    productionDeployments: deploymentRows(deployments.payload).map(sanitizeDeployment),
    classification,
    rawValuesPersisted: false,
    tokenPersisted: false,
  };
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, "flag-drift-audit.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return result;
}

async function main() {
  const envFile = process.env.COMUN_A3_PRODUCTION_ENV_FILE;
  const productionEnvText = envFile ? await fs.readFile(envFile, "utf8") : "";
  const result = await auditA3FlagDrift({
    token: process.env.VERCEL_TOKEN,
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_ORG_ID,
    productionEnvText,
  });
  const c = result.classification;
  console.log(`COMUN_48_5_A3_R2_D1_FLAG_AUDIT_${c.status}`);
  console.log(`productionValueState=${c.productionValueState}`);
  console.log(`duplicateProduction=${c.duplicateProduction}`);
  console.log(`sharedConflict=${c.sharedConflict}`);
  console.log(`rawValuesPersisted=${result.rawValuesPersisted}`);
  console.log(`tokenPersisted=${result.tokenPersisted}`);
  if (c.status !== "GREEN") process.exitCode = 1;
}

if (process.argv[1]?.endsWith("audit-48-5-a3-flag-drift.mjs")) await main();
