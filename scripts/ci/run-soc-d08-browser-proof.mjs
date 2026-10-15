import { spawn, execFileSync } from "node:child_process";
import {
  readFileSync,
  mkdirSync,
  writeFileSync,
  createWriteStream,
} from "node:fs";
import { freemem, totalmem } from "node:os";
import { pathToFileURL } from "node:url";

export function assertSyntheticEnvironment(env) {
  for (const name of [
    "SUPABASE_DB_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ]) {
    if (env[name]) throw new Error("SOC_D08_DIAGNOSTICS_EXTERNAL_ENV_REFUSED");
  }
}
export function parseMemoryEvents(text) {
  const allowed = new Set([
    "low",
    "high",
    "max",
    "oom",
    "oom_kill",
    "oom_group_kill",
  ]);
  return Object.fromEntries(
    text
      .trim()
      .split(/\n/)
      .flatMap((line) => {
        const [key, value] = line.trim().split(/\s+/);
        return allowed.has(key) && /^\d+$/.test(value)
          ? [[key, Number(value)]]
          : [];
      }),
  );
}
function snapshot() {
  const result = { availableBytes: freemem(), totalBytes: totalmem() };
  try {
    result.cgroupEvents = parseMemoryEvents(
      readFileSync("/sys/fs/cgroup/memory.events", "utf8"),
    );
  } catch {
    /* Not available on every host. */
  }
  for (const field of ["current", "max", "peak"]) {
    try {
      const value = readFileSync(
        `/sys/fs/cgroup/memory.${field}`,
        "utf8",
      ).trim();
      if (/^(\d+|max)$/.test(value)) result[`cgroup_${field}`] = value;
    } catch {
      /* Availability is recorded by absence, never inferred. */
    }
  }
  return result;
}
export function exitStatus(code, signal) {
  return signal || code === null ? 1 : code;
}
export async function main() {
  assertSyntheticEnvironment(process.env);
  const directory = "test-results/solidarity-continuity";
  mkdirSync(directory, { recursive: true });
  const sha = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const evidence = {
    runSha: sha,
    samples: [{ phase: "before", ...snapshot() }],
  };
  const log = createWriteStream(`${directory}/native-browser.log`);
  const child = spawn(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "-c",
      "playwright.solidarity-continuity.config.ts",
    ],
    {
      env: { ...process.env, DEBUG: "pw:browser" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout.pipe(process.stdout);
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
    log.write(chunk);
  });
  const timer = setInterval(() => {
    if (evidence.samples.length < 1300)
      evidence.samples.push({ phase: "during", ...snapshot() });
  }, 1000);
  const outcome = await new Promise((resolve) => {
    child.once("error", () =>
      resolve({ code: null, signal: null, spawnFailed: true }),
    );
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  clearInterval(timer);
  evidence.samples.push({ phase: "after", ...snapshot() });
  evidence.outcome = outcome;
  await new Promise((resolve) => log.end(resolve));
  writeFileSync(
    `${directory}/runner-resources.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  process.exitCode = exitStatus(outcome.code, outcome.signal);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();
