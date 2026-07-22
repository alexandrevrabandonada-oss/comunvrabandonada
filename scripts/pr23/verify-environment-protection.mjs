import { CANONICAL_BRANCH, OWNER, REPO, arg, github, loadFixture, fail } from "./lib.mjs";
import { pathToFileURL } from "node:url";

export function evaluateEnvironment({ environment, branchPolicies }, expectedName) {
  if (!environment || environment.name !== expectedName) return { ok: false, reason: "PR23_ENVIRONMENT_PROTECTION_MISSING", environment: expectedName };
  const reviewers = environment.protection_rules?.find((rule) => rule.type === "required_reviewers")?.reviewers ?? [];
  const policy = environment.deployment_branch_policy;
  const restrictive = Boolean(policy && policy.protected_branches === false && policy.custom_branch_policies === true);
  const canonicalOnly = branchPolicies?.length === 1 && branchPolicies[0]?.name === CANONICAL_BRANCH;
  if (!reviewers.length || !restrictive || !canonicalOnly) return { ok: false, reason: "PR23_ENVIRONMENT_PROTECTION_MISSING", environment: expectedName, reviewerCount: reviewers.length, restrictive, canonicalOnly };
  return { ok: true, gate: "PR23_ENVIRONMENT_PROTECTION_OK", environment: expectedName, reviewerCount: reviewers.length, branch: CANONICAL_BRANCH };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const name = arg("environment");
  if (!name) throw new Error("usage: --environment=<name>");
  const fixture = await loadFixture();
  let data = fixture;
  if (!data) {
    const encoded = encodeURIComponent(name);
    const environment = await github(`/repos/${OWNER}/${REPO}/environments/${encoded}`);
    const response = await github(`/repos/${OWNER}/${REPO}/environments/${encoded}/deployment-branch-policies?per_page=100`);
    data = { environment, branchPolicies: response.branch_policies ?? [] };
  }
  const result = evaluateEnvironment(data, name);
  console.log(JSON.stringify(result));
  if (!result.ok) fail(result.reason);
}
