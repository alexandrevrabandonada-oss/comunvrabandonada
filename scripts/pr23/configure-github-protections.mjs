import { pathToFileURL } from "node:url";
import { OWNER, REPO, CANONICAL_BRANCH, arg, github } from "./lib.mjs";

export const ENVIRONMENTS = [
  "pr23-backup-gate",
  "pr23-remote-migration",
  "pr23-domain-transfer",
  "pr23-final-merge",
];

export const REQUIRED_CHECKS = [
  "pr23/fast-gate",
  "pr23/full-local-gate",
  "pr23/readiness",
  "pr23/two-person-review",
];

export function buildPlan(reviewer) {
  return {
    mode: "dry-run",
    repository: `${OWNER}/${REPO}`,
    branch: CANONICAL_BRANCH,
    reviewer: reviewer || "REQUIRED_BEFORE_APPLY",
    environments: ENVIRONMENTS.map((name) => ({
      name,
      requiredReviewers: reviewer ? [reviewer] : [],
      preventSelfReview: true,
      allowedBranches: [CANONICAL_BRANCH],
    })),
    mainProtection: {
      requiredChecks: REQUIRED_CHECKS,
      strict: true,
      approvals: 2,
      dismissStaleReviews: true,
      requireLastPushApproval: true,
      forcePushes: false,
      deletions: false,
    },
  };
}

async function configureEnvironment(name, reviewerId) {
  await github(`/repos/${OWNER}/${REPO}/environments/${name}`, undefined, {
    method: "PUT",
    body: JSON.stringify({
      wait_timer: 0,
      prevent_self_review: true,
      reviewers: [{ type: "User", id: reviewerId }],
      deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
    }),
  });
  const policies = await github(`/repos/${OWNER}/${REPO}/environments/${name}/deployment-branch-policies?per_page=100`);
  for (const policy of policies.branch_policies ?? []) {
    if (policy.name !== CANONICAL_BRANCH) {
      await github(`/repos/${OWNER}/${REPO}/environments/${name}/deployment-branch-policies/${policy.id}`, undefined, { method: "DELETE" });
    }
  }
  if (!(policies.branch_policies ?? []).some((policy) => policy.name === CANONICAL_BRANCH)) {
    await github(`/repos/${OWNER}/${REPO}/environments/${name}/deployment-branch-policies`, undefined, {
      method: "POST",
      body: JSON.stringify({ name: CANONICAL_BRANCH, type: "branch" }),
    });
  }
}

async function apply(reviewer) {
  if (!reviewer) throw new Error("PR23_REQUIRED_REVIEWER_MISSING");
  if (!process.env.GITHUB_TOKEN) throw new Error("PR23_GITHUB_TOKEN_MISSING");
  const user = await github(`/users/${encodeURIComponent(reviewer)}`);
  for (const environment of ENVIRONMENTS) await configureEnvironment(environment, user.id);
  await github(`/repos/${OWNER}/${REPO}/branches/main/protection`, undefined, {
    method: "PUT",
    body: JSON.stringify({
      required_status_checks: { strict: true, contexts: REQUIRED_CHECKS },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismissal_restrictions: {},
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        required_approving_review_count: 2,
        require_last_push_approval: true,
      },
      restrictions: null,
      required_linear_history: false,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_conversation_resolution: true,
      lock_branch: false,
      allow_fork_syncing: true,
    }),
  });
  console.log("PR23_GITHUB_PROTECTIONS_APPLIED");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const applyMode = process.argv.includes("--apply");
  const reviewer = arg("reviewer") ?? process.env.PR23_REQUIRED_REVIEWER;
  const plan = buildPlan(reviewer);
  if (!applyMode) console.log(JSON.stringify(plan, null, 2));
  else await apply(reviewer);
}
