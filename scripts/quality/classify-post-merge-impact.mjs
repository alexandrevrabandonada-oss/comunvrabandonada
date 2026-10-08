import { readFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  classifyBuildImpact,
  changedFilesFromDiff,
} from "../ci/vercel-build-impact.mjs";

const SHA = /^[a-f0-9]{40}$/;

export function classifyRemoteQualityScope({
  eventName,
  ref,
  sha,
  before,
  after,
  mode,
  files = [],
  diffAvailable = false,
}) {
  if (ref !== "refs/heads/main" || !SHA.test(sha ?? "")) {
    throw new Error("COMUN_QUALITY_IMPACT_INVALID_CONTEXT");
  }
  if (eventName === "workflow_dispatch" && mode === "full") {
    return {
      runRemote: true,
      status: "COMUN_QUALITY_REMOTE_REQUIRED",
      reason: "explicit-full-rehearsal",
    };
  }
  if (
    eventName !== "push" ||
    !SHA.test(before ?? "") ||
    /^0+$/.test(before) ||
    after !== sha
  ) {
    throw new Error("COMUN_QUALITY_IMPACT_INVALID_CONTEXT");
  }
  const impact = classifyBuildImpact({
    files,
    diffAvailable,
    vercelEnv: "production",
    commitRef: "main",
  });
  const runRemote = !(
    impact.decision === "IGNORE" && impact.reason === "no-runtime-allowlist"
  );
  return {
    runRemote,
    status: runRemote
      ? "COMUN_QUALITY_REMOTE_REQUIRED"
      : "COMUN_QUALITY_REMOTE_NOT_APPLICABLE_NO_RUNTIME",
    reason: impact.reason,
  };
}

export function run(env = process.env) {
  const event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf8"));
  const context = {
    eventName: env.GITHUB_EVENT_NAME,
    ref: env.GITHUB_REF,
    sha: env.GITHUB_SHA,
    before: event.before,
    after: event.after,
    mode: event.inputs?.mode,
  };
  // Validate context before using any event-supplied object in git commands.
  classifyRemoteQualityScope(context);
  const diff =
    context.eventName === "push"
      ? changedFilesFromDiff({ base: context.before, head: context.sha })
      : { available: false, files: [] };
  const result = classifyRemoteQualityScope({
    ...context,
    files: diff.files,
    diffAvailable: diff.available,
  });
  if (!env.GITHUB_OUTPUT) {
    throw new Error("COMUN_QUALITY_IMPACT_OUTPUT_REQUIRED");
  }
  appendFileSync(env.GITHUB_OUTPUT, `run_remote=${result.runRemote}\n`);
  console.log(JSON.stringify({ ...result, expectedSha: context.sha }));
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run();
}
