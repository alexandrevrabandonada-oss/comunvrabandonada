import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.COMUN_QUALITY_A11Y_PORT ?? 3037);
const baseUrl = process.env.COMUN_BASE_URL ?? `http://127.0.0.1:${port}`;
const artifactDir =
  process.env.COMUN_QUALITY_A11Y_ARTIFACT_DIR ??
  ".ci-artifacts/p1-quality-a11y";
const command = process.argv.slice(2);

if (command.length === 0) {
  throw new Error(
    "usage: node scripts/quality/run-isolated-a11y.mjs <command> [...args]",
  );
}

mkdirSync(artifactDir, { recursive: true });
const nextLogPath = `${artifactDir}/next.log`;
const testLogPath = `${artifactDir}/a11y.log`;
const monitorPath = `${artifactDir}/monitor.jsonl`;
const monitor = createWriteStream(monitorPath, { flags: "w" });

const env = {
  ...process.env,
  COMUN_BASE_URL: baseUrl,
  NEXT_PUBLIC_SITE_URL: baseUrl,
  PLAYWRIGHT_SKIP_WEBSERVER: "1",
};

const isWindows = process.platform === "win32";
const serverCommand = isWindows ? "cmd.exe" : "npm";
const serverArgs = isWindows
  ? ["/d", "/s", "/c", `npm run start -- -H 127.0.0.1 -p ${port}`]
  : ["run", "start", "--", "-H", "127.0.0.1", "-p", String(port)];
const server = spawn(serverCommand, serverArgs, {
  env,
  detached: !isWindows,
  stdio: ["ignore", "pipe", "pipe"],
});
const nextPid = server.pid;
let serverExit = null;
server.once("exit", (code, signal) => {
  serverExit = { code, signal };
});
server.stdout.pipe(createWriteStream(nextLogPath, { flags: "w" }));
server.stderr.pipe(createWriteStream(nextLogPath, { flags: "a" }));

const snapshot = (label) => {
  const result = isWindows
    ? spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          "Get-Process node,chrome -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,WorkingSet64",
        ],
        {
          encoding: "utf8",
        },
      )
    : spawnSync(
        "bash",
        [
          "-lc",
          "free -h; df -h . /dev/shm 2>/dev/null || true; ps -eo pid,ppid,stat,comm | head -80",
        ],
        {
          encoding: "utf8",
        },
      );
  writeFileSync(
    `${artifactDir}/${label}-resources.txt`,
    result.stdout ?? "",
    "utf8",
  );
};

const pidAlive = () => {
  try {
    process.kill(nextPid, 0);
    return true;
  } catch {
    return false;
  }
};

const httpStatus = async (path) => {
  try {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    return `${Math.floor(response.status / 100)}xx`;
  } catch {
    return "unreachable";
  }
};

const health = async (path = "/comun") => {
  const status = await httpStatus(path);
  return { pidAlive: pidAlive(), serverExited: serverExit, http: status };
};

const writeHealth = async (elapsed, path = "/comun") => {
  monitor.write(`${JSON.stringify({ elapsed, ...(await health(path)) })}\n`);
};

const cleanup = async () => {
  if (isWindows && pidAlive()) {
    spawnSync("taskkill", ["/PID", String(nextPid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else if (!server.killed && pidAlive()) {
    try {
      process.kill(-nextPid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    await delay(1500);
    if (pidAlive()) {
      try {
        process.kill(-nextPid, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
    }
  }
  monitor.end();
};

const startedAt = Date.now();
snapshot("before");
let initial = null;
for (let attempt = 1; attempt <= 45; attempt += 1) {
  initial = await health();
  if (
    initial.pidAlive &&
    initial.http === "2xx" &&
    (await httpStatus("/comun/entrar")) === "2xx"
  )
    break;
  await delay(2000);
}
if (
  !initial?.pidAlive ||
  initial.serverExited ||
  initial.http !== "2xx" ||
  (await httpStatus("/comun/entrar")) !== "2xx"
) {
  await writeHealth(`${Math.round((Date.now() - startedAt) / 1000)}s`);
  await cleanup();
  writeFileSync(
    `${artifactDir}/result.json`,
    JSON.stringify(
      {
        result: "COMUN_P1_CI_QUALITY_SERVER_INITIAL_BLOCKED",
        nextPid,
        initial,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  writeFileSync(
    `${artifactDir}/initial-health.json`,
    JSON.stringify(
      { result: "COMUN_P1_CI_QUALITY_SERVER_INITIAL_GREEN", nextPid, initial },
      null,
      2,
    ),
  );
  const interval = setInterval(() => {
    void writeHealth(`${Math.round((Date.now() - startedAt) / 1000)}s`);
  }, 10000);
  const test = isWindows
    ? spawn("cmd.exe", ["/d", "/s", "/c", command.join(" ")], {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      })
    : spawn(command[0], command.slice(1), {
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });
  test.stdout.pipe(createWriteStream(testLogPath, { flags: "w" }));
  test.stderr.pipe(createWriteStream(testLogPath, { flags: "a" }));
  const exitCode = await new Promise((resolve) =>
    test.once("close", (code, signal) => resolve({ code, signal })),
  );
  clearInterval(interval);
  await writeHealth(`${Math.round((Date.now() - startedAt) / 1000)}s`);
  snapshot("after");
  const finalHealth = await health();
  let result = "COMUN_P1_CI_A11Y_TARGETED_GREEN";
  if (exitCode.code !== 0) {
    result = !finalHealth.pidAlive
      ? "COMUN_P1_CI_QUALITY_SERVER_PROCESS_EXITED"
      : finalHealth.http === "unreachable"
        ? "COMUN_P1_CI_QUALITY_SERVER_HTTP_FAILURE"
        : "COMUN_P1_CI_BROWSER_FAILURE";
  }
  writeFileSync(
    `${artifactDir}/result.json`,
    JSON.stringify(
      { result, nextPid, command, exitCode, finalHealth },
      null,
      2,
    ),
  );
  await cleanup();
  process.exitCode = exitCode.code ?? 1;
}
