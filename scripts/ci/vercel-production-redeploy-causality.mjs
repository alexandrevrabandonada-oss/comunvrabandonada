import fs from "node:fs";

export const REDEPLOY_DECISIONS = Object.freeze({
  REUSE_FRESH_READY: "REUSE_FRESH_READY",
  REUSE_READY_PROMOTE_ONLY: "REUSE_READY_PROMOTE_ONLY",
  WAIT_FOR_EXISTING_EXACT_SHA: "WAIT_FOR_EXISTING_EXACT_SHA",
  BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT: "BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT",
  BUILD_REQUIRED_NO_EXACT_SHA: "BUILD_REQUIRED_NO_EXACT_SHA",
  BUILD_REQUIRED_METADATA_UNCERTAIN: "BUILD_REQUIRED_METADATA_UNCERTAIN",
  BUILD_REQUIRED_WAIT_TIMEOUT: "BUILD_REQUIRED_WAIT_TIMEOUT",
});

const ACTIVE_STATES = new Set(["QUEUED", "INITIALIZING", "BUILDING"]);
const TERMINAL_BUILD_FAILURES = new Set(["CANCELED", "CANCELLED", "ERROR", "FAILED"]);

function asTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function invalid(reason, extra = {}) {
  return {
    decision: REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN,
    needsBuild: true,
    needsPromotion: false,
    reason,
    ...extra,
  };
}

function validSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function validDeployment(deployment) {
  return deployment && typeof deployment === "object"
    && typeof deployment.id === "string"
    && typeof deployment.sha === "string"
    && typeof deployment.state === "string"
    && typeof deployment.target === "string"
    && asTimestamp(deployment.createdAt) !== null;
}

/**
 * Convert Vercel deployment metadata to the small, non-secret contract used by
 * the decision core. This intentionally drops every field except deployment
 * identity, lifecycle, source, commit, and alias evidence.
 */
export function normalizeDeployments(payload, canonicalDomain = "https://comunsocial.online") {
  const rows = Array.isArray(payload) ? payload : payload?.deployments ?? payload?.data;
  if (!Array.isArray(rows)) throw new TypeError("deployments must be an array");
  if (typeof canonicalDomain !== "string" || canonicalDomain.length === 0) {
    throw new TypeError("canonicalDomain is required");
  }
  return rows.map((row) => {
    if (!row || typeof row !== "object") throw new TypeError("deployment row is invalid");
    const aliases = Array.isArray(row.alias) ? row.alias : [];
    const sha = row.sha ?? row.meta?.githubCommitSha ?? row.meta?.commitSha;
    return {
      id: row.id,
      url: typeof row.url === "string" ? `https://${row.url.replace(/^https?:\/\//, "")}` : null,
      state: row.state,
      target: row.target,
      createdAt: row.createdAt ?? row.created,
      source: row.source ?? row.meta?.source ?? "unknown",
      sha,
      canonical: aliases.includes(canonicalDomain) || aliases.includes(canonicalDomain.replace(/^https?:\/\//, "")),
    };
  });
}

/**
 * Return the latest metadata timestamp for a relevant Production env key.
 * Values are never inspected. A present key without trustworthy timestamps is
 * deliberately an error: callers must build rather than reuse uncertain code.
 */
export function relevantEnvMutationAt(payload, key) {
  if (!key || typeof key !== "string") throw new TypeError("env key is required");
  const rows = Array.isArray(payload) ? payload : payload?.envs ?? payload?.data;
  if (!Array.isArray(rows)) throw new TypeError("env metadata must be an array");
  const matches = rows.filter((row) => row?.key === key && (row.target ?? []).includes("production"));
  if (matches.length === 0) return null;
  const timestamps = matches.flatMap((row) => [row.updatedAt, row.createdAt].map(asTimestamp).filter(Boolean));
  if (timestamps.length === 0) throw new TypeError("relevant env metadata has no valid timestamp");
  return Math.max(...timestamps);
}

function outputFor(decision, fields = {}) {
  const needsBuild = decision === REDEPLOY_DECISIONS.BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT
    || decision === REDEPLOY_DECISIONS.BUILD_REQUIRED_NO_EXACT_SHA
    || decision === REDEPLOY_DECISIONS.BUILD_REQUIRED_METADATA_UNCERTAIN
    || decision === REDEPLOY_DECISIONS.BUILD_REQUIRED_WAIT_TIMEOUT;
  return { decision, needsBuild, needsPromotion: false, ...fields };
}

/**
 * Decide whether a Production runner must create a new build, may reuse a
 * READY deployment, or should wait for an exact SHA already in progress.
 * The function has no network or filesystem dependency and is safe to test as
 * a pure policy boundary.
 */
export function decideProductionRedeploy({
  exactSha,
  deployments,
  relevantEnvMutationAt: envMutationAt = null,
  envWriteOccurred = false,
  metadataAvailable = true,
}) {
  if (!metadataAvailable || !validSha(exactSha) || !Array.isArray(deployments)) {
    return invalid("required deployment metadata is unavailable or malformed");
  }
  if (envWriteOccurred && asTimestamp(envMutationAt) === null) {
    return invalid("env write occurred without a trustworthy mutation timestamp");
  }
  if (envMutationAt !== null && asTimestamp(envMutationAt) === null) {
    return invalid("env mutation timestamp is malformed");
  }

  const production = deployments.filter((deployment) => deployment?.target === "production");
  if (production.some((deployment) => !validDeployment(deployment))) {
    return invalid("production deployment metadata is malformed");
  }
  const exact = production
    .filter((deployment) => deployment.sha?.toLowerCase() === exactSha.toLowerCase())
    .sort((a, b) => asTimestamp(b.createdAt) - asTimestamp(a.createdAt));
  if (exact.length === 0) return outputFor(REDEPLOY_DECISIONS.BUILD_REQUIRED_NO_EXACT_SHA);

  const mutation = asTimestamp(envMutationAt);
  for (const deployment of exact) {
    const created = asTimestamp(deployment.createdAt);
    const stale = mutation !== null && created <= mutation;
    if (stale) continue;
    if (deployment.state === "READY") {
      const fields = {
        deploymentId: deployment.id,
        deploymentUrl: deployment.url,
        canonical: deployment.canonical === true,
        source: deployment.source,
        createdAt: created,
        relevantEnvMutationAt: mutation,
      };
      return outputFor(
        fields.canonical
          ? REDEPLOY_DECISIONS.REUSE_FRESH_READY
          : REDEPLOY_DECISIONS.REUSE_READY_PROMOTE_ONLY,
        { ...fields, needsPromotion: !fields.canonical },
      );
    }
    if (ACTIVE_STATES.has(deployment.state)) {
      return outputFor(REDEPLOY_DECISIONS.WAIT_FOR_EXISTING_EXACT_SHA, {
        deploymentId: deployment.id,
        deploymentUrl: deployment.url,
        source: deployment.source,
        createdAt: created,
        relevantEnvMutationAt: mutation,
      });
    }
    if (!TERMINAL_BUILD_FAILURES.has(deployment.state)) {
      return invalid(`unknown deployment state: ${deployment.state}`);
    }
  }
  return outputFor(
    mutation !== null
      ? REDEPLOY_DECISIONS.BUILD_REQUIRED_ENV_NEWER_THAN_DEPLOYMENT
      : REDEPLOY_DECISIONS.BUILD_REQUIRED_NO_EXACT_SHA,
    { relevantEnvMutationAt: mutation },
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

if (process.argv[1] && process.argv[1].endsWith("vercel-production-redeploy-causality.mjs")) {
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 1) {
    const match = process.argv[i].match(/^--([^=]+)=(.*)$/);
    if (match) args.set(match[1], match[2]);
  }
  try {
    const exactSha = args.get("exact-sha");
    const deployments = normalizeDeployments(readJson(args.get("deployments")), args.get("canonical-domain"));
    const envPayload = readJson(args.get("env-metadata"));
    const mutation = relevantEnvMutationAt(envPayload, args.get("env-key"));
    const result = decideProductionRedeploy({
      exactSha,
      deployments,
      relevantEnvMutationAt: mutation,
      envWriteOccurred: args.get("env-write") === "true",
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(invalid(error instanceof Error ? error.message : "metadata parse failed"))}\n`);
  }
}
