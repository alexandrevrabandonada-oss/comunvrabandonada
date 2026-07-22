import { pathToFileURL } from "node:url";
import { OWNER, REPO, PR_NUMBER, CANONICAL_BRANCH, arg, github, loadFixture } from "./lib.mjs";
import { evaluateReviews } from "./verify-independent-reviews.mjs";

export const REQUESTS = {
  "pr23:run-backup": {
    operation: "backup",
    required: ["pr23/fast-gate", "pr23/full-local-gate", "pr23/readiness"],
  },
  "pr23:run-migration": {
    operation: "migration",
    required: ["pr23/backup-restore", "pr23/restored-production-like"],
  },
  "pr23:run-domain-transfer": {
    operation: "domain-transfer",
    required: ["pr23/controlled-migration", "pr23/remote-preview"],
  },
  "pr23:run-final-merge": {
    operation: "final-merge",
    required: ["pr23/domain-transfer"],
  },
  "pr23:run-rollback": {
    operation: "rollback",
    required: [],
  },
};

export function evaluateProtectedRequest({ label, expectedSha, actor, permission, pull, reviews, commits, statuses }) {
  const request = REQUESTS[label];
  if (!request) return { ok: false, reason: "PR23_LABEL_NOT_ALLOWED" };
  if (pull.number !== PR_NUMBER || pull.head.ref !== CANONICAL_BRANCH) return { ok: false, reason: "PR23_PULL_REQUEST_MISMATCH" };
  if (pull.head.sha !== expectedSha) return { ok: false, reason: "PR23_SHA_CHANGED" };
  if (!["admin", "maintain", "write"].includes(permission)) return { ok: false, reason: "PR23_REQUESTER_PERMISSION_DENIED" };
  if (!actor) return { ok: false, reason: "PR23_REQUESTER_MISSING" };
  const reviewResult = evaluateReviews({ pull, reviews, commits });
  if (!reviewResult.ok) return { ok: false, reason: reviewResult.reason };
  const latest = new Map();
  for (const status of statuses) if (!latest.has(status.context)) latest.set(status.context, status.state);
  const missing = request.required.filter((context) => latest.get(context) !== "success");
  if (missing.length) return { ok: false, reason: `PR23_PRIOR_CHECKS_MISSING:${missing.join(",")}` };
  return { ok: true, operation: request.operation, label, sha: expectedSha, actor };
}

async function liveInput() {
  const label = arg("label");
  const expectedSha = arg("sha");
  const actor = arg("actor");
  const [pull, reviews, commits, combined, collaborator] = await Promise.all([
    github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}`),
    github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/reviews?per_page=100`),
    github(`/repos/${OWNER}/${REPO}/pulls/${PR_NUMBER}/commits?per_page=100`),
    github(`/repos/${OWNER}/${REPO}/commits/${expectedSha}/status?per_page=100`),
    github(`/repos/${OWNER}/${REPO}/collaborators/${encodeURIComponent(actor)}/permission`),
  ]);
  return { label, expectedSha, actor, permission: collaborator.permission, pull, reviews, commits, statuses: combined.statuses ?? [] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await loadFixture();
  const result = evaluateProtectedRequest(fixture ?? (await liveInput()));
  if (!result.ok) throw new Error(result.reason);
  console.log(JSON.stringify(result));
}
