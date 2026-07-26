import { spawnSync } from "node:child_process";

const base = process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^";
const head = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
const diff = spawnSync("git", ["diff", "--name-only", base, head], {
  encoding: "utf8",
});

if (diff.status !== 0) {
  console.log("COMUN_VERCEL_BUILD_REQUIRED:diff-unavailable");
  process.exit(1);
}

const files = diff.stdout
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);
const docsOnly =
  files.length > 0 &&
  files.every(
    (file) => file.startsWith("docs/") || file.startsWith("reports/"),
  );

if (docsOnly) {
  console.log("COMUN_VERCEL_BUILD_IGNORED:docs-reports-only");
  process.exit(0);
}

console.log("COMUN_VERCEL_BUILD_REQUIRED:runtime-change");
process.exit(1);
