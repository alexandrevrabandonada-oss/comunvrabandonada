import { loadFixture, writeGenerated } from "./lib.mjs";
import { pathToFileURL } from "node:url";

export function compute(input) {
  const local = input.ci && input.fullLocal && input.reviews && input.environmentProtection && input.vercelPreview && input.mainUnchanged;
  const migrated = local && input.backupRestore && input.productionLike && input.migration && input.remotePreview;
  const readyToMerge = migrated && input.domain && input.mergeEnvironmentApproval;
  const decision = readyToMerge ? "READY_TO_MERGE_AND_MONITOR" : local && input.backupRestore && input.productionLike && input.migrationEnvironmentApproval ? "READY_FOR_CONTROLLED_REMOTE_MIGRATION" : "NO_GO_REMOTE_INTEGRATION";
  return { decision, sha: input.sha, gates: { ...input }, evaluatedAt: new Date().toISOString() };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await loadFixture();
  if (!fixture) throw new Error("PR23_READINESS_INPUT_REQUIRED: use --fixture with sanitized gate state");
  const result = compute(fixture);
  const rows = Object.entries(result.gates).filter(([key]) => key !== "sha").map(([key, value]) => `| ${key} | ${value ? "PASS" : "PENDING"} |`).join("\n");
  const markdown = `# PR #23 readiness\n\n- SHA: \`${result.sha}\`\n- Decision: **${result.decision}**\n\n| Gate | State |\n| --- | --- |\n${rows}`;
  await writeGenerated("pr23-readiness", result, markdown);
  console.log(result.decision);
}
