import { execFileSync } from "node:child_process";
import {
  changedFilesFromDiff,
  classifyBuildImpact,
  commitMessageFromGit,
  hasPreviewCheckpoint,
  isCodexBranch,
} from "./vercel-build-impact.mjs";

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const PREVIEW_HOST_PATTERN = /\.vercel\.app$/i;

function validPreviewUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && PREVIEW_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

export function findLatestPreviewCheckpoint(commits = []) {
  return (
    commits.find((commit) => hasPreviewCheckpoint(commit?.message ?? ""))?.sha ??
    null
  );
}

export function selectValidPreviewDeployment({
  deployments = [],
  statusesByDeployment = {},
  expectedSha = null,
}) {
  for (const deployment of deployments) {
    if (
      deployment?.environment !== "Preview" ||
      !SHA_PATTERN.test(deployment?.sha ?? "") ||
      (expectedSha && deployment.sha !== expectedSha)
    ) {
      continue;
    }
    const statuses = statusesByDeployment[deployment.id] ?? [];
    const status = statuses.find(
      (candidate) =>
        candidate?.state === "success" && validPreviewUrl(candidate.environment_url),
    );
    if (status) return { deployment, status };
  }
  return null;
}

export function classifyPreviewGateDiff({
  files,
  diffAvailable = true,
  branch,
  commitMessageAvailable = true,
  commitMessage = "",
}) {
  const result = classifyBuildImpact({
    files,
    diffAvailable,
    vercelEnv: "preview",
    commitRef: branch,
    commitMessageAvailable,
    commitMessage,
  });
  return {
    ...result,
    requiresCheckpoint: !(
      result.decision === "IGNORE" && result.reason === "no-runtime-allowlist"
    ),
  };
}

export function evaluatePreviewGate({
  branch,
  baseBranch = "main",
  fullDiff,
  checkpointSha,
  preview,
  postCheckpointDiff,
  postCheckpointDiffAvailable = true,
  headCommitMessage = "",
}) {
  if (!isCodexBranch(branch)) {
    return { decision: "PASS", reason: "non-codex-branch" };
  }
  if (baseBranch !== "main") {
    return { decision: "FAIL", reason: "base-not-main" };
  }

  const full = classifyPreviewGateDiff({
    files: fullDiff?.files,
    diffAvailable: fullDiff?.available ?? false,
    branch,
    commitMessageAvailable: true,
    commitMessage: headCommitMessage,
  });
  if (!full.requiresCheckpoint) {
    return { decision: "PASS", reason: "no-runtime-change" };
  }
  if (!checkpointSha) {
    return { decision: "FAIL", reason: "checkpoint-missing" };
  }
  if (!preview) {
    return { decision: "FAIL", reason: "preview-not-valid-for-checkpoint" };
  }
  if (!postCheckpointDiffAvailable) {
    return { decision: "FAIL", reason: "checkpoint-diff-unavailable" };
  }
  if (!(postCheckpointDiff?.files?.length ?? 0)) {
    return { decision: "PASS", reason: "checkpoint-fresh" };
  }

  const post = classifyPreviewGateDiff({
    files: postCheckpointDiff.files,
    diffAvailable: true,
    branch,
    commitMessageAvailable: true,
    commitMessage: headCommitMessage,
  });
  if (!post.requiresCheckpoint) {
    return { decision: "PASS", reason: "checkpoint-fresh-safe-followup" };
  }
  return { decision: "FAIL", reason: "checkpoint-stale" };
}

function runGit(args) {
  try {
    return { status: 0, stdout: execFileSync("git", args, { encoding: "utf8" }) };
  } catch (error) {
    return { status: error.status ?? 1, stdout: String(error.stdout ?? "") };
  }
}

function gitText(args) {
  const result = runGit(args);
  if (result.status !== 0) throw new Error("COST_02_GIT_LOOKUP_FAILED");
  return result.stdout;
}

function githubApi(repository, pathname) {
  try {
    return JSON.parse(
      execFileSync("gh", ["api", `repos/${repository}/${pathname}`], {
        encoding: "utf8",
      }),
    );
  } catch {
    throw new Error("COST_02_GITHUB_API_FAILED");
  }
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function fetchValidPreview({ repository, checkpointSha }) {
  for (let attempt = 1; attempt <= 12; attempt += 1) {
    const deployments = githubApi(
      repository,
      `deployments?sha=${checkpointSha}&environment=Preview&per_page=100`,
    );
    const statusesByDeployment = {};
    for (const deployment of deployments) {
      statusesByDeployment[deployment.id] = githubApi(
        repository,
        `deployments/${deployment.id}/statuses?per_page=100`,
      );
    }
    const preview = selectValidPreviewDeployment({
      deployments,
      statusesByDeployment,
      expectedSha: checkpointSha,
    });
    if (preview) return preview;
    if (attempt < 12) sleep(10_000);
  }
  return null;
}

function collectCommits(base, head) {
  return gitText(["rev-list", "--first-parent", `${base}..${head}`])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((sha) => ({ sha, message: commitMessageFromGit({ head: sha }).message }));
}

function validSha(value) {
  return SHA_PATTERN.test(value ?? "");
}

function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const branch = process.env.PR_HEAD_REF ?? process.env.GITHUB_HEAD_REF ?? "";
  const head = process.env.PR_HEAD_SHA ?? process.env.GITHUB_SHA ?? "HEAD";
  const baseBranch = process.env.PR_BASE_REF ?? "main";

  if (!isCodexBranch(branch)) {
    console.log("COMUN_COST_02_NOT_APPLICABLE:non-codex-branch");
    return;
  }
  if (!repository || !validSha(head)) {
    throw new Error("COST_02_CONTEXT_INVALID");
  }

  const base = gitText(["merge-base", `refs/remotes/origin/${baseBranch}`, head]).trim();
  const fullDiff = changedFilesFromDiff({ base, head });
  const headCommit = commitMessageFromGit({ head });
  const checkpointSha = findLatestPreviewCheckpoint(collectCommits(base, head));

  let preview = null;
  if (checkpointSha) {
    preview = fetchValidPreview({ repository, checkpointSha });
  }

  const postCheckpointDiff = checkpointSha
    ? changedFilesFromDiff({ base: checkpointSha, head })
    : { available: true, files: [] };
  const result = evaluatePreviewGate({
    branch,
    baseBranch,
    fullDiff,
    checkpointSha,
    preview,
    postCheckpointDiff,
    postCheckpointDiffAvailable: postCheckpointDiff.available,
    headCommitMessage: headCommit.message,
  });

  console.log(`COMUN_COST_02_${result.decision}:${result.reason}`);
  if (result.decision !== "PASS") process.exitCode = 1;
}

if (process.argv[1]?.endsWith("verify-codex-preview-checkpoint.mjs")) main();
