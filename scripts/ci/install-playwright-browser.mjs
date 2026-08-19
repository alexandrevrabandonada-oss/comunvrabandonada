import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
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
  return new Promise((resolve) => {
    const child = spawn(npx, ["--no-install", "playwright", ...args], {
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    let output = "";
    let timedOut = false;
    let finished = false;
    let forceKillTimer;
    const append = (chunk) => {
      output += chunk.toString();
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const timeout = setTimeout(() => {
      timedOut = true;
      const message = `ETIMEDOUT: provisioning command exceeded ${COMMAND_TIMEOUT_MS}ms`;
      output += `\n${message}`;
      try {
        if (process.platform === "win32") child.kill();
        else process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill();
      }
      forceKillTimer = setTimeout(() => {
        try {
          if (process.platform === "win32") child.kill();
          else process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
        finish(null, "ETIMEDOUT: provisioning process group did not exit cleanly");
      }, 5_000);
    }, COMMAND_TIMEOUT_MS);
    const finish = (status, error = "") => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      if (error) output += `\n${error}`;
      writeFileSync(logPath, sanitizedOutput(output));
      resolve({ status: timedOut ? null : status, output });
    };
    child.once("error", (error) => {
      finish(null, `${error.code || "spawn_error"}: ${error.message}`);
    });
    child.once("close", (status) => finish(status));
  });
}

async function runWithLimitedRetry(args, label) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`COMUN_BROWSER_PROVISIONING_STEP=${label} attempt=${attempt}`);
    const result = await runPlaywright(args, `${label}-${attempt}`);
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

if (!(await runWithLimitedRetry(["install-deps", "chromium"], "system-dependencies"))) {
  process.exit(1);
}

const installed = await runPlaywright(["install", "--list"], "browser-list");
const hasChromium =
  installed.status === 0 && /chromium/i.test(installed.output);
if (process.env.PLAYWRIGHT_CACHE_HIT !== "true" || !hasChromium) {
  if (!(await runWithLimitedRetry(["install", "chromium"], "chromium"))) {
    process.exit(1);
  }
} else {
  console.log("COMUN_BROWSER_PROVISIONING_CACHE_REUSED=true");
  summary("COMUN_BROWSER_PROVISIONING_CACHE_REUSED=true");
}

console.log("COMUN_BROWSER_PROVISIONING_GREEN");
summary("COMUN_BROWSER_PROVISIONING_GREEN");
