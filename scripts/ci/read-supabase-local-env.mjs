import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_ATTEMPTS = 3;

const REQUIRED_KEYS = ["API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "DB_URL"];

export function classifyTransientStatusFailure(output) {
  const text = String(output ?? "");
  if (
    /(?:error\s+status|http\s+status)\s+502\b/i.test(text) &&
    /invalid response.*upstream|upstream server/i.test(text)
  ) {
    return "UPSTREAM_502";
  }
  if (
    /(?:error\s+status|http\s+status)\s+503\b/i.test(text) &&
    /service unavailable|upstream/i.test(text)
  ) {
    return "UPSTREAM_503";
  }
  if (
    /(?:error\s+status|http\s+status)\s+504\b/i.test(text) &&
    /gateway|upstream|timeout/i.test(text)
  ) {
    return "UPSTREAM_504";
  }
  return null;
}

export function hasRequiredLocalEnv(output) {
  const keys = new Set(
    String(output ?? "")
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z0-9_]+)=".*"$/)?.[1])
      .filter(Boolean),
  );
  return REQUIRED_KEYS.every((key) => keys.has(key));
}

export function isMainModule(metaUrl, argvPath) {
  return metaUrl === pathToFileURL(resolve(argvPath)).href;
}

function defaultInvoke() {
  return spawnSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function defaultSleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function readSupabaseLocalEnv({
  invoke = defaultInvoke,
  sleep = defaultSleep,
  diagnostics = (line) => process.stderr.write(`${line}\n`),
} = {}) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = invoke();
    if (result.status === 0) {
      if (!hasRequiredLocalEnv(result.stdout)) {
        diagnostics("COMUN_SUPABASE_LOCAL_STATUS_INVALID_OUTPUT");
        return { ok: false, attempts: attempt, reason: "INVALID_OUTPUT" };
      }
      return { ok: true, attempts: attempt, output: result.stdout };
    }

    const transientClass = classifyTransientStatusFailure(
      `${result.stderr ?? ""}\n${result.stdout ?? ""}`,
    );
    if (!transientClass) {
      diagnostics("COMUN_SUPABASE_LOCAL_STATUS_NON_TRANSIENT_FAILURE");
      return { ok: false, attempts: attempt, reason: "NON_TRANSIENT" };
    }

    if (attempt === MAX_ATTEMPTS) {
      diagnostics("COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_EXHAUSTED");
      diagnostics(`attempts=${attempt}`);
      diagnostics(`class=${transientClass}`);
      return { ok: false, attempts: attempt, reason: transientClass };
    }

    diagnostics("COMUN_SUPABASE_LOCAL_STATUS_TRANSIENT_RETRY");
    diagnostics(`attempt=${attempt}`);
    diagnostics(`class=${transientClass}`);
    sleep(attempt * 500);
  }

  throw new Error("unreachable local Supabase status state");
}

if (isMainModule(import.meta.url, process.argv[1])) {
  const result = readSupabaseLocalEnv();
  if (!result.ok) process.exitCode = 1;
  else process.stdout.write(result.output);
}
