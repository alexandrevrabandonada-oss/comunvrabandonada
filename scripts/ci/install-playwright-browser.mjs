import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const MAX_ATTEMPTS = 2;
const COMMAND_TIMEOUT_MS = 8 * 60 * 1000;
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const version = (() => {
  try {
    return (
      process.env.PLAYWRIGHT_VERSION ||
      require("@playwright/test/package.json").version
    );
  } catch {
    return "unknown";
  }
})();
const artifactDir = process.env.RUNNER_TEMP
  ? path.join(process.env.RUNNER_TEMP, "comun-browser-provisioning")
  : path.join(process.cwd(), ".ci-artifacts", "browser-provisioning");
mkdirSync(artifactDir, { recursive: true });

function summary(line) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`, { flag: "a" });
  }
}

function retryableNetworkFailure(output) {
  return /EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|network|socket hang up|download|502|503|504/i.test(
    output,
  );
}

function sanitizedOutput(value) {
  return String(value || "")
    .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/gi, "$1[redacted]")
    .replace(/(token|secret|password)=([^&\s]+)/gi, "$1=[redacted]")
    .slice(-12000);
}

function runPlaywright(args, label) {
  const logPath = path.join(artifactDir, `${label}.log`);
  const result = spawnSync(npx, ["--no-install", "playwright", ...args], {
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  writeFileSync(logPath, sanitizedOutput(output));
  return { ...result, output };
}

function runWithLimitedRetry(args, label) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`COMUN_BROWSER_PROVISIONING_STEP=${label} attempt=${attempt}`);
    const result = runPlaywright(args, `${label}-${attempt}`);
    if (result.status === 0) return true;
    const retryable = retryableNetworkFailure(result.output);
    if (!retryable || attempt === MAX_ATTEMPTS) {
      const reason = retryable
        ? "network_retry_exhausted"
        : "non_network_failure";
      summary(`COMUN_BROWSER_PROVISIONING_FAILED:${label}:${reason}`);
      console.error(`COMUN_BROWSER_PROVISIONING_FAILED:${label}:${reason}`);
      console.error(sanitizedOutput(result.output));
      return false;
    }
    console.warn(`COMUN_BROWSER_PROVISIONING_RETRY:${label}:network`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000);
  }
  return false;
}

console.log(
  `COMUN_BROWSER_PROVISIONING_CACHE_HIT=${process.env.PLAYWRIGHT_CACHE_HIT === "true"}`,
);
console.log(`COMUN_BROWSER_PROVISIONING_VERSION=${version}`);
summary(
  `COMUN_BROWSER_PROVISIONING_CACHE_HIT=${process.env.PLAYWRIGHT_CACHE_HIT === "true"}`,
);
summary(`COMUN_BROWSER_PROVISIONING_VERSION=${version}`);

if (!runWithLimitedRetry(["install-deps", "chromium"], "system-dependencies")) {
  process.exit(1);
}

const installed = runPlaywright(["install", "--list"], "browser-list");
const hasChromium =
  installed.status === 0 && /chromium/i.test(installed.output);
if (process.env.PLAYWRIGHT_CACHE_HIT !== "true" || !hasChromium) {
  if (!runWithLimitedRetry(["install", "chromium"], "chromium")) {
    process.exit(1);
  }
} else {
  console.log("COMUN_BROWSER_PROVISIONING_CACHE_REUSED=true");
  summary("COMUN_BROWSER_PROVISIONING_CACHE_REUSED=true");
}

console.log("COMUN_BROWSER_PROVISIONING_GREEN");
summary("COMUN_BROWSER_PROVISIONING_GREEN");
