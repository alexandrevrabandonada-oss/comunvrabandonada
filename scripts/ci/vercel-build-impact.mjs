import { spawnSync } from "node:child_process";

const SAFE_MARKDOWN_ROOTS = new Set([
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
]);

const SAFE_TEST_FILE = /(?:^|\/)[^/]+\.(?:test|spec)\.(?:ts|tsx)$/;
const SAFE_OPERATIONAL_SCRIPT = /^scripts\/(?:solo|audit|diagnostics)\//;

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
    return { decision: "BUILD", reason: buildReason(unsafeFile) };
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

function defaultSpawn(command, args) {
  return spawnSync(command, args, {
    encoding: "utf8",
  });
}
