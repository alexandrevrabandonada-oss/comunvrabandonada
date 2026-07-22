import { execFileSync } from "node:child_process";

export function evaluatePromotion(input) {
  if (input.eventName === "pull_request" && input.label !== "comun:promover") return { ok: false, reason: "SOLO_LABEL_NOT_ALLOWED" };
  if (!new Set(["admin", "maintain"]).has(input.permission)) return { ok: false, reason: "SOLO_OPERATOR_PERMISSION_DENIED" };
  if (!/^\d+$/.test(String(input.pr)) || !/^[0-9a-f]{40}$/.test(input.expectedSha ?? "")) return { ok: false, reason: "SOLO_PROMOTION_INPUT_INVALID" };
  if (input.actualSha !== input.expectedSha) return { ok: false, reason: "SOLO_SHA_CHANGED" };
  if (input.mergeable !== "MERGEABLE") return { ok: false, reason: "SOLO_PR_NOT_MERGEABLE" };
  return { ok: true, pr: String(input.pr), sha: input.expectedSha };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  const env = process.env;
  const pr = env.EVENT_NAME === "pull_request" ? env.EVENT_PR : env.INPUT_PR;
  const expectedSha = env.EVENT_NAME === "pull_request" ? env.EVENT_SHA : env.INPUT_SHA;
  const api = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
  const permission = JSON.parse(api(["api", `repos/${env.GITHUB_REPOSITORY}/collaborators/${env.REQUEST_ACTOR}/permission`])).permission;
  const pull = JSON.parse(api(["pr", "view", String(pr), "--json", "headRefOid,mergeable"]));
  const result = evaluatePromotion({ eventName: env.EVENT_NAME, label: env.EVENT_LABEL, permission, pr, expectedSha, actualSha: pull.headRefOid, mergeable: pull.mergeable });
  if (!result.ok) throw new Error(result.reason);
  process.stdout.write(`sha=${result.sha}\npr=${result.pr}\n`);
}
