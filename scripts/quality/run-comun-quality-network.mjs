import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPackage = require("@playwright/test/package.json");
const playwrightCli = path.join(
  path.dirname(require.resolve("playwright/package.json")),
  "cli.js",
);
const playwrightCoreRoot = path.dirname(
  require.resolve("playwright-core/package.json"),
);
const browsers = JSON.parse(
  readFileSync(path.join(playwrightCoreRoot, "browsers.json"), "utf8"),
);
const chromium = browsers.browsers.find(({ name }) => name === "chromium");

export function classifyNetworkRun({ exitCode, signal, browserCrash }) {
  if (browserCrash || signal === "SIGSEGV") return "browser_process_crash";
  if (exitCode === 0) return "green";
  return "functional_failure";
}

function resolveSha() {
  if (process.env.COMUN_QUALITY_NETWORK_SHA)
    return process.env.COMUN_QUALITY_NETWORK_SHA;
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

async function run() {
  const command = process.execPath;
  const child = spawn(
    command,
    [playwrightCli, "test", "-c", "playwright.quality-network.config.ts"],
    {
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    },
  );

  let browserCrash = false;
  let browserSignal = null;
  const inspect = (chunk, destination) => {
    destination.write(chunk);
    const line = chunk.toString("utf8");
    if (/SIGSEGV|SEGV_MAPERR|Received signal 11/.test(line)) {
      browserCrash = true;
      browserSignal = "SIGSEGV";
    }
  };
  child.stdout.on("data", (chunk) => inspect(chunk, process.stdout));
  child.stderr.on("data", (chunk) => inspect(chunk, process.stderr));

  const completion = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  const exitCode = completion.exitCode ?? 1;
  const signal = browserSignal ?? completion.signal ?? null;
  const artifact = {
    run: process.env.GITHUB_RUN_ID ?? "local",
    attempt: process.env.GITHUB_RUN_ATTEMPT ?? "local",
    SHA: resolveSha(),
    runner:
      process.env.RUNNER_OS && process.env.ImageOS
        ? `${process.env.RUNNER_OS}-${process.env.ImageOS}`
        : `${process.platform}-${process.arch}`,
    Node: process.version,
    Playwright: playwrightPackage.version,
    "Chromium revision": chromium
      ? `${chromium.revision} (${chromium.browserVersion})`
      : "unknown",
    projeto: "320x568-low-android",
    etapa: "quality:network",
    "exit code": exitCode,
    signal,
    classificacao: classifyNetworkRun({
      exitCode,
      signal,
      browserCrash,
    }),
  };

  await mkdir(".ci-artifacts/quality-performance", { recursive: true });
  await writeFile(
    ".ci-artifacts/quality-performance/06-network-runtime.json",
    `${JSON.stringify(artifact, null, 2)}\n`,
    { mode: 0o600 },
  );
  process.exitCode = exitCode;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  await run();
}
