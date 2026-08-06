import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const artifactDir =
  process.env.COMUN_R2A_ARTIFACT_DIR ?? ".ci-artifacts/r2a-private-runtime-e2e";
const projectLabel = "com.supabase.cli.project=COMUM_VR_ABANDONADA";
const startupLimitMs = 12 * 60 * 1000;
const heartbeatMs = 20 * 1000;

const redact = (value) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => {
      const secretLabel = line.match(
        /^(\s*(?:publishable|secret|access key|secret key)\b)/i,
      );
      if (secretLabel) return `${secretLabel[1]} [REDACTED]`;
      const jsonSecret = line.match(
        /^(\s*"?(?:PUBLISHABLE_KEY|SECRET|SERVICE_ROLE|ANON_KEY|ACCESS_KEY|SECRET_KEY)"?\s*:\s*)/i,
      );
      if (jsonSecret) return `${jsonSecret[1]}[REDACTED]`;
      if (
        /(service[_ -]?role|anon(?:[_ -]?key)?|access[_ -]?token|password|secret|jwt|api[_ -]?key|connection[_ -]?string|publishable|access key|secret key)/i.test(
          line,
        )
      ) {
        return line
          .replace(/(:\s*|=\s*).*/g, "$1[REDACTED]")
          .replace(
            /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g,
            "[KEY_REDACTED]",
          );
      }
      return line;
    })
    .join("\n")
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://[REDACTED]")
    .replace(/eyJ[a-zA-Z0-9._-]+/g, "[JWT_REDACTED]")
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g, "[KEY_REDACTED]");

const timestamp = () => new Date().toISOString();
const append = async (name, value) =>
  appendFile(
    `${artifactDir}/${name}`,
    `${redact(value).replace(/\r?\n?$/, "")}\n`,
  );
const run = (command, args = [], timeout = 30_000) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout,
    killSignal: "SIGTERM",
    env: { ...process.env, DO_NOT_TRACK: "1", SUPABASE_DISABLE_TELEMETRY: "1" },
  });
  const timedOut = result.error?.code === "ETIMEDOUT";
  return {
    status: timedOut ? 124 : (result.status ?? 1),
    output: redact(
      `${result.stdout ?? ""}${result.stderr ?? ""}${timedOut ? `\n${command} timeout=${timeout}ms` : ""}`,
    ),
  };
};

await mkdir(artifactDir, { recursive: true });
for (const file of [
  "environment.txt",
  "timestamps.txt",
  "docker-info.txt",
  "docker-disk.txt",
  "supabase-version.txt",
  "startup.log",
  "startup-exit.txt",
  "startup-classification.json",
]) {
  await writeFile(`${artifactDir}/${file}`, "");
}
await append(
  "environment.txt",
  `runner_os=${process.env.RUNNER_OS ?? "unknown"}\nci=${process.env.CI ?? "unknown"}\nrun_id=${process.env.GITHUB_RUN_ID ?? "unknown"}\nproject_label=${projectLabel}`,
);
await append("timestamps.txt", `created=${timestamp()}`);
await append("supabase-version.txt", run("supabase", ["--version"]).output);
await append(
  "docker-info.txt",
  [
    "$ docker version",
    run("docker", ["version"]).output,
    "$ docker info",
    run("docker", ["info"]).output,
    "$ docker ps -a",
    run("docker", ["ps", "-a"]).output,
  ].join("\n"),
);
await append(
  "docker-disk.txt",
  [
    "$ docker system df",
    run("docker", ["system", "df"]).output,
    "$ df -h",
    run("df", ["-h"]).output,
    "$ free -h",
    run("free", ["-h"]).output,
  ].join("\n"),
);

const startupArgs = [
  "start",
  "-x",
  "studio,realtime,mailpit,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy",
];
await append(
  "startup.log",
  `$ supabase ${startupArgs.join(" ")}\nstarted=${timestamp()}`,
);
const startedAt = Date.now();
let timedOut = false;
let outputBuffer = "";
const child = spawn("supabase", startupArgs, {
  env: { ...process.env, DO_NOT_TRACK: "1", SUPABASE_DISABLE_TELEMETRY: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
const forward = async (chunk) => {
  const text = redact(chunk.toString());
  outputBuffer += text;
  await append("startup.log", text);
  process.stdout.write(text);
};
child.stdout.on("data", (chunk) => void forward(chunk));
child.stderr.on("data", (chunk) => void forward(chunk));

const heartbeat = setInterval(() => {
  const elapsed = Date.now() - startedAt;
  const bucket =
    elapsed < 60_000
      ? "under_1m"
      : elapsed < 180_000
        ? "1_to_3m"
        : elapsed < 360_000
          ? "3_to_6m"
          : elapsed < 540_000
            ? "6_to_9m"
            : "9_to_12m";
  const line = `COMUN_R2A_SUPABASE_START_PENDING elapsed=${bucket}`;
  process.stdout.write(`${line}\n`);
  void append("startup.log", line);
}, heartbeatMs);

const exitCode = await new Promise((resolve) => {
  const timeout = setTimeout(() => {
    timedOut = true;
    process.stdout.write("COMUN_R2A_SUPABASE_START_TIMEOUT elapsed=12m\n");
    void append("startup.log", "COMUN_R2A_SUPABASE_START_TIMEOUT elapsed=12m");
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 10_000).unref();
  }, startupLimitMs);
  child.once("close", (code, signal) => {
    clearTimeout(timeout);
    resolve({ code: code ?? 1, signal });
  });
});
clearInterval(heartbeat);
await append(
  "timestamps.txt",
  `finished=${timestamp()}\nelapsed_ms=${Date.now() - startedAt}`,
);
await writeFile(`${artifactDir}/startup-exit.txt`, `${exitCode.code}\n`);

const status = run("supabase", ["status", "-o", "json"]);
await append("startup.log", `\n$ supabase status -o json\n${status.output}`);
const rawEnv =
  spawnSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    env: { ...process.env, DO_NOT_TRACK: "1", SUPABASE_DISABLE_TELEMETRY: "1" },
  }).stdout ?? "";
const envValue = (name) =>
  rawEnv.match(new RegExp(`^${name}="?([^"\\r\\n]+)`, "m"))?.[1] ?? "";
const apiUrl = envValue("API_URL");
const dbUrl = envValue("DB_URL");
const endpointStatus = {};
for (const [name, path] of [
  ["auth", "/auth/v1/health"],
  ["postgrest", "/rest/v1/"],
  ["storage", "/storage/v1/bucket"],
]) {
  try {
    const response = await fetch(`${apiUrl}${path}`, { redirect: "manual" });
    endpointStatus[name] = response.status;
  } catch {
    endpointStatus[name] = null;
  }
}
const dbMatch = dbUrl.match(/@(?:127\.0\.0\.1|localhost):(\d+)\//);
const dbProbe = dbMatch
  ? run("pg_isready", [
      "-h",
      "127.0.0.1",
      "-p",
      dbMatch[1],
      "-U",
      "postgres",
      "-d",
      "postgres",
    ]).status
  : 1;
endpointStatus.database = dbProbe === 0;
if (timedOut || exitCode.code !== 0) {
  const containerIds = run("docker", [
    "ps",
    "-aq",
    "--filter",
    `label=${projectLabel}`,
  ])
    .output.split(/\s+/)
    .filter(Boolean);
  await append(
    "startup.log",
    `\n$ docker ps -a --filter label=${projectLabel}\n${run("docker", ["ps", "-a", "--filter", `label=${projectLabel}`]).output}`,
  );
  for (const id of containerIds) {
    await append(
      "startup.log",
      `\n$ docker inspect ${id}\n${run("docker", ["inspect", id]).output}`,
    );
    await append(
      "startup.log",
      `\n$ docker logs --tail 200 ${id}\n${run("docker", ["logs", "--tail", "200", id]).output}`,
    );
  }
}

let classification = "COMUN_48_1B_R2A_BLOCKED_CI_SERVICE_HEALTH";
if (timedOut)
  classification = "COMUN_48_1B_R2A_BLOCKED_CI_SUPABASE_START_TIMEOUT";
else if (exitCode.signal)
  classification = "COMUN_48_1B_R2A_BLOCKED_CI_EXTERNAL_CANCELLATION";
else if (
  exitCode.code !== 0 &&
  /(pull|registry|manifest|extract|network)/i.test(outputBuffer)
)
  classification = "COMUN_48_1B_R2A_BLOCKED_CI_IMAGE_PULL";
else if (
  exitCode.code === 0 &&
  status.status === 0 &&
  endpointStatus.database === true &&
  Object.entries(endpointStatus)
    .filter(([key]) => key !== "database")
    .every(([, code]) => Number.isInteger(code) && code < 500)
)
  classification = "COMUN_48_1B_R2A_CI_STARTUP_GREEN";
await writeFile(
  `${artifactDir}/startup-classification.json`,
  JSON.stringify(
    {
      result: classification,
      startExit: exitCode.code,
      signal: exitCode.signal ?? null,
      statusCommandExit: status.status,
      elapsedMs: Date.now() - startedAt,
      services: endpointStatus,
    },
    null,
    2,
  ) + "\n",
);
if (classification !== "COMUN_48_1B_R2A_CI_STARTUP_GREEN") process.exit(1);
