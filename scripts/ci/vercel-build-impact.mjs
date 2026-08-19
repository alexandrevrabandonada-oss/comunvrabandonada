import { spawnSync } from "node:child_process";

const SAFE_MARKDOWN_ROOTS = new Set([
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
]);

const SAFE_TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:ts|tsx)$/;
const SAFE_OPERATIONAL_SCRIPT = /^scripts\/(?:solo|audit|diagnostics)\//;
const CODEX_BRANCH_PREFIX = "codex/";
export const PREVIEW_CHECKPOINT_MARKER = "[comun-preview]";

const BUILD_PREFIXES = [
  "app/",
  "components/",
  "lib/",
  "pages/",
  "public/",
  "src/",
  "styles/",
  "middleware.",
  "instrumentation.",
  "supabase/",
];

const BUILD_FILE_PATTERNS = [
  /^vercel\.json$/,
  /^package\.json$/,
  /^(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /^tsconfig(?:\.[^/]+)?\.json$/,
  /^(?:next|postcss|tailwind|vite|webpack|rollup|turbo|vitest|playwright)\.config\./,
  /^(?:eslint\.config\.|\.eslintrc)/,
  /^(?:Dockerfile(?:\..*)?|\.dockerignore)$/,
  /^(?:Makefile|docker-compose(?:\..*)?)$/,
  /^(?:\.env(?:\..*)?|env\/|config\/|configs\/)/,
];

function normalizePath(file) {
  return String(file ?? "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function normalizeRef(value) {
  return String(value ?? "").replace(/^refs\/heads\//, "");
}

export function isCodexBranch(commitRef) {
  return normalizeRef(commitRef).startsWith(CODEX_BRANCH_PREFIX);
}

export function hasPreviewCheckpoint(commitMessage) {
  return String(commitMessage ?? "").includes(PREVIEW_CHECKPOINT_MARKER);
}

function isProduction({ vercelEnv, commitRef }) {
  return (
    vercelEnv === "production" ||
    commitRef === "main" ||
    commitRef === "refs/heads/main"
  );
}

function isSafeNoRuntimePath(file) {
  if (file.startsWith("docs/") || file.startsWith("reports/")) return true;
  if (file.startsWith(".github/workflows/")) return true;
  if (file.startsWith("tests/") || file.startsWith("e2e/")) return true;
  if (SAFE_TEST_FILE.test(file)) return true;
  if (SAFE_OPERATIONAL_SCRIPT.test(file)) return true;
  return SAFE_MARKDOWN_ROOTS.has(file);
}

function buildReason(file) {
  if (file.startsWith("scripts/ci/")) return "build-script-change";
  if (file.startsWith("supabase/")) return "database-release-change";
  if (file === "vercel.json") return "vercel-config-change";
  if (BUILD_FILE_PATTERNS.some((pattern) => pattern.test(file))) {
    return "dependency-or-build-config-change";
  }
  if (BUILD_PREFIXES.some((prefix) => file.startsWith(prefix))) {
    return "runtime-path-change";
  }
  return "unknown-file-class";
}

export function classifyBuildImpact({
  files,
  diffAvailable = true,
  vercelEnv = "",
  commitRef = "",
  commitMessageAvailable = true,
  commitMessage = "",
}) {
  if (vercelEnv !== "preview" && vercelEnv !== "production") {
    return { decision: "BUILD", reason: "environment-inconsistent" };
  }

  if (isProduction({ vercelEnv, commitRef })) {
    return { decision: "BUILD", reason: "production-build" };
  }

  if (!commitRef) {
    return { decision: "BUILD", reason: "environment-inconsistent" };
  }

  if (!diffAvailable) {
    return { decision: "BUILD", reason: "diff-unavailable" };
  }

  const normalizedFiles = Array.isArray(files)
    ? files.map(normalizePath).filter(Boolean)
    : [];

  if (normalizedFiles.length === 0) {
    return { decision: "BUILD", reason: "empty-diff" };
  }

  const unsafeFile = normalizedFiles.find(
    (file) => !isSafeNoRuntimePath(file),
  );
  if (unsafeFile) {
    const reason = buildReason(unsafeFile);
    if (isCodexBranch(commitRef) && reason === "runtime-path-change") {
      if (!commitMessageAvailable) {
        return { decision: "BUILD", reason: "commit-message-unavailable" };
      }
      if (hasPreviewCheckpoint(commitMessage)) {
        return { decision: "BUILD", reason: "codex-preview-checkpoint" };
      }
      return {
        decision: "IGNORE",
        reason: "codex-runtime-awaiting-preview-checkpoint",
      };
    }
    return { decision: "BUILD", reason };
  }

  return { decision: "IGNORE", reason: "no-runtime-allowlist" };
}

export function changedFilesFromDiff({
  base,
  head,
  spawn = defaultSpawn,
}) {
  if (!base || !head) return { available: false, files: [] };

  const baseCheck = spawn("git", ["rev-parse", "--verify", `${base}^{commit}`]);
  const headCheck = spawn("git", ["rev-parse", "--verify", `${head}^{commit}`]);
  if (baseCheck.status !== 0 || headCheck.status !== 0) {
    return { available: false, files: [] };
  }

  const diff = spawn("git", ["diff", "--name-only", base, head]);
  if (diff.status !== 0) return { available: false, files: [] };

  return {
    available: true,
    files: String(diff.stdout ?? "")
      .split(/\r?\n/)
      .map(normalizePath)
      .filter(Boolean),
  };
}

export function commitMessageFromGit({ head, spawn = defaultSpawn }) {
  if (!head) return { available: false, message: "" };
  const result = spawn("git", ["show", "-s", "--format=%B", head]);
  const message = String(result.stdout ?? "");
  if (result.status !== 0 || !message.trim()) {
    return { available: false, message: "" };
  }
  return { available: true, message };
}

function defaultSpawn(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
  });
}
