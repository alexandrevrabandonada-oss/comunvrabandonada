import { execFileSync } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  RESULT,
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const root = process.cwd();
const externalPresence = await readExternalPresence();
const forbiddenPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/,
  /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  /\b(?:SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY)\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/i,
  /\bHCAPTCHA_SECRET\s*[:=]\s*["']?0x[A-Fa-f0-9]{30,}/i,
];
const ignored = new Set([
  "package-lock.json",
  "scripts/security/audit-comun-secrets-boundary.mjs",
]);

const inventory = [
  item(
    "Supabase public client",
    "client_runtime",
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    "public",
  ),
  item(
    "Supabase privileged API",
    "server_runtime",
    ["SUPABASE_SERVICE_ROLE_KEY"],
    "critical",
  ),
  item(
    "Supabase database recovery",
    "github_actions",
    ["SUPABASE_DB_URL", "SUPABASE_DB_PASSWORD", "SUPABASE_PROJECT_REF"],
    "critical",
  ),
  item(
    "Vercel deployment control",
    "github_actions",
    ["VERCEL_TOKEN", "VERCEL_TEAM_ID", "VERCEL_CANONICAL_PROJECT_ID"],
    "critical",
  ),
  item(
    "Archive scheduler webhook",
    "github_actions",
    ["ARCHIVE_PROCESSING_ENDPOINT", "ARCHIVE_PROCESSING_CRON_SECRET"],
    "high",
  ),
  item(
    "CAPTCHA public site configuration",
    "client_runtime",
    ["NEXT_PUBLIC_HCAPTCHA_SITEKEY"],
    "public",
  ),
  item(
    "CAPTCHA provider secret",
    "supabase_auth",
    ["HCAPTCHA_SECRET"],
    "critical",
    "rotation_requires_human",
  ),
  item(
    "Object storage provider",
    "server_runtime",
    ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT"],
    "high",
  ),
];

try {
  const tracked = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    },
  )
    .split("\0")
    .filter(Boolean);
  const clientBuildFiles = await listClientBuildFiles(
    path.join(root, ".next", "static"),
  );
  const findings = [];
  let filesScanned = 0;
  for (const relative of tracked) {
    if (
      ignored.has(relative) ||
      /(?:^|\/)(?:backups|node_modules|\.next)\//.test(relative)
    )
      continue;
    if (/^\.env(?:\.|$)/.test(relative) && relative !== ".env.example") {
      findings.push("tracked_environment_file");
      continue;
    }
    const absolute = path.join(root, relative);
    const metadata = await stat(absolute).catch(() => null);
    if (!metadata?.isFile() || metadata.size > 5 * 1024 * 1024) continue;
    const content = await readFile(absolute, "utf8").catch(() => "");
    if (content.includes("\u0000")) continue;
    filesScanned += 1;
    if (forbiddenPatterns.some((pattern) => pattern.test(content)))
      findings.push(classifySurface(relative));
  }
  for (const absolute of clientBuildFiles) {
    const metadata = await stat(absolute).catch(() => null);
    if (!metadata?.isFile() || metadata.size > 5 * 1024 * 1024) continue;
    const content = await readFile(absolute, "utf8").catch(() => "");
    filesScanned += 1;
    if (forbiddenPatterns.some((pattern) => pattern.test(content)))
      findings.push("client_bundle_or_source_map");
  }

  const history = execFileSync(
    "git",
    [
      "log",
      "-30",
      "-p",
      "--no-ext-diff",
      "--",
      ".",
      ":(exclude)package-lock.json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    },
  );
  if (forbiddenPatterns.some((pattern) => pattern.test(history)))
    findings.push("recent_history");

  const uniqueFindings = [...new Set(findings)];
  const unexpected = uniqueFindings.length;
  const status = unexpected ? "unexpected_public_exposure" : "present";
  const evidence = await writeEvidence("20-secrets-boundary.json", {
    result: unexpected ? "COMUN_SECRETS_BOUNDARY_BLOCKED" : RESULT.secrets,
    repository: {
      trackedFilesScanned: filesScanned,
      recentCommitsScanned: 30,
      trackedEnvironmentFiles: findings.includes("tracked_environment_file")
        ? "unexpected_public_exposure"
        : "present",
      bundleAndSourceExposure: status,
      findingSurfaces: uniqueFindings,
    },
    inventory: inventory.map(({ required, ...entry }) => ({
      ...entry,
      status:
        entry.forcedStatus ||
        required.every(
          (name) => Boolean(process.env[name]) || externalPresence.has(name),
        )
          ? entry.forcedStatus || "present"
          : "missing",
      rotation:
        entry.forcedStatus === "rotation_requires_human"
          ? "rotation_requires_human"
          : entry.privilege === "public"
            ? "rotation_supported"
            : "rotation_supported",
    })),
    valuesPrinted: false,
    prefixesPrinted: false,
    hashesPrinted: false,
  });
  console.log(evidence.result);
  if (unexpected) process.exitCode = 1;
} catch (error) {
  await writeFailureEvidence("secrets_boundary", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}

async function listClientBuildFiles(directory) {
  const entries = await readdir(directory, {
    recursive: true,
    withFileTypes: true,
  }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath || entry.path, entry.name))
    .filter((file) => /\.(?:js|mjs|map|json)$/i.test(file));
}

function item(logicalName, environment, required, privilege, forcedStatus) {
  return {
    logicalName,
    environment,
    responsibleSystem:
      environment === "github_actions"
        ? "GitHub Actions"
        : environment === "supabase_auth"
          ? "Supabase Auth"
          : "Vercel/Supabase runtime",
    consumedAt: environment,
    privilege,
    required,
    forcedStatus,
    lastVerification: "current_run",
    risk: privilege === "critical" ? "P0_if_exposed" : "bounded",
  };
}

function classifySurface(relative) {
  if (relative.startsWith(".github/")) return "workflow_source";
  if (relative.startsWith("reports/")) return "report";
  if (/\.(?:png|jpe?g|webp)$/i.test(relative)) return "screenshot";
  if (relative.startsWith("scripts/")) return "script_fixture";
  if (relative.startsWith("app/") || relative.startsWith("lib/"))
    return "application_source";
  return "repository_other";
}

async function readExternalPresence() {
  const file = process.env.COMUN_SECURITY_VERCEL_ENV_FILE;
  if (!file) return new Set();
  const content = await readFile(file, "utf8").catch(() => "");
  return new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => line.slice(0, line.indexOf("="))),
  );
}
