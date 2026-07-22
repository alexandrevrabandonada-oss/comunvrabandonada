import { pathToFileURL } from "node:url";
import { OWNER, REPO, arg, github } from "./lib.mjs";

export const STATUS_CONTEXTS = new Set([
  "pr23/fast-gate",
  "pr23/full-local-gate",
  "pr23/readiness",
  "pr23/two-person-review",
  "pr23/backup-restore",
  "pr23/restored-production-like",
  "pr23/controlled-migration",
  "pr23/remote-preview",
  "pr23/domain-transfer",
  "pr23/final-merge-readiness",
]);

export function validateStatus({ sha, context, state, description }) {
  if (!/^[a-f0-9]{40}$/i.test(sha ?? "")) throw new Error("PR23_STATUS_SHA_INVALID");
  if (!STATUS_CONTEXTS.has(context)) throw new Error("PR23_STATUS_CONTEXT_INVALID");
  if (!["error", "failure", "pending", "success"].includes(state)) throw new Error("PR23_STATUS_STATE_INVALID");
  if (!description || description.length > 140) throw new Error("PR23_STATUS_DESCRIPTION_INVALID");
  return { sha, context, state, description };
}

async function publish(input) {
  const validated = validateStatus(input);
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ mode: "dry-run", ...validated }));
    return;
  }
  await github(`/repos/${OWNER}/${REPO}/statuses/${validated.sha}`, process.env.GITHUB_TOKEN, {
    method: "POST",
    body: JSON.stringify({
      state: validated.state,
      context: validated.context,
      description: validated.description,
    }),
  });
  console.log(`PR23_STATUS_PUBLISHED:${validated.context}:${validated.state}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await publish({
    sha: arg("sha"),
    context: arg("context"),
    state: arg("state"),
    description: arg("description"),
  });
}
