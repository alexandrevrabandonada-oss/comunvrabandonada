import { changedFilesFromDiff, classifyBuildImpact } from "./vercel-build-impact.mjs";

const base = process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^";
const head = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
const diff = changedFilesFromDiff({ base, head });
const result = classifyBuildImpact({
  files: diff.files,
  diffAvailable: diff.available,
  vercelEnv: process.env.VERCEL_ENV || "",
  commitRef: process.env.VERCEL_GIT_COMMIT_REF || "",
});

if (result.decision === "IGNORE") {
  console.log(`COMUN_VERCEL_BUILD_IGNORED:${result.reason}`);
  process.exit(0);
}

console.log(`COMUN_VERCEL_BUILD_REQUIRED:${result.reason}`);
process.exit(1);
