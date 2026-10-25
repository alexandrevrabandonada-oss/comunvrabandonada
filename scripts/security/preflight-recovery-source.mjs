import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = "nvmdszymrtacfehdynpg";
const HOST = "aws-0-us-west-2.pooler.supabase.com";
const IMAGE =
  "sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675";
const CA_HASH =
  "700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7";
const CA = fileURLToPath(
  new URL("./supabase-prod-ca-2021.crt", import.meta.url),
);
const QUERY =
  "select current_setting('transaction_read_only')='on', current_setting('server_version_num')::int>=170000, (select ssl from pg_stat_ssl where pid=pg_backend_pid());";

function reject(code) {
  throw new Error(code);
}

// Pure validation: no network, subprocess, credential discovery or URL repair.
export function validateSource(text) {
  const values = new Map();
  const keys = [
    "SUPABASE_DB_URL",
    "SUPABASE_PROJECT_REF",
    "PGSSLMODE",
    "PGSSLROOTCERT",
    "PGOPTIONS",
  ];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Z_]+)=(.*)$/.exec(line);
    if (!match || !keys.includes(match[1]) || values.has(match[1]))
      reject("CONFIG_INVALID");
    values.set(match[1], match[2].trim().replace(/^(["'])(.*)\1$/, "$2"));
  }
  if (values.get("SUPABASE_PROJECT_REF") !== PROJECT)
    reject("PROJECT_MISMATCH");
  if (
    values.get("PGSSLMODE") !== "verify-full" ||
    values.get("PGOPTIONS") !== "-c default_transaction_read_only=on"
  )
    reject("PROTECTION_MISMATCH");
  let url;
  try {
    url = new URL(values.get("SUPABASE_DB_URL"));
  } catch {
    reject("CONNECTION_FORMAT_INVALID");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    reject("CONNECTION_FORMAT_INVALID");
  if (
    url.hostname !== HOST ||
    url.username !== `postgres.${PROJECT}` ||
    (url.port || "5432") !== "5432" ||
    url.pathname !== "/postgres"
  )
    reject("TARGET_MISMATCH");
  // Do not allow a URL query to override TLS, options or the fixed destination.
  if (url.search || url.hash) reject("URL_OVERRIDES_REJECTED");
  let password;
  try {
    password = decodeURIComponent(url.password);
  } catch {
    reject("PASSWORD_ENCODING_INVALID");
  }
  if (!password || /YOUR[_ -]?PASSWORD/i.test(password))
    reject("PASSWORD_MISSING");
  if (password !== password.trim() || /[\r\n\0]/.test(password))
    reject("PASSWORD_FORMAT_INVALID");
  return { password };
}

export function classifyProbe(result) {
  if (!result.error && result.status === 0 && result.stdout?.trim() === "t|t|t")
    return "READ_ONLY_TLS_PROBE_PASS";
  const error = result.stderr || "";
  if (/Tenant or user not found/i.test(error)) return "POOLER_TARGET_REJECTED";
  if (/password authentication failed/i.test(error))
    return "AUTHENTICATION_REJECTED";
  if (/certificate|SSL/i.test(error)) return "TLS_REJECTED";
  if (
    /could not translate host|network is unreachable|Name or service not known/i.test(
      error,
    )
  )
    return "NETWORK_UNAVAILABLE";
  if (result.error || /timed out|timeout/i.test(error))
    return "PROBE_EXECUTION_UNAVAILABLE";
  return "PROBE_UNVERIFIED";
}

export function probePlan(password, certificate = CA, inherited = process.env) {
  // Remove inherited libpq overrides; the connection is defined only here.
  const env = Object.fromEntries(
    Object.entries(inherited).filter(([key]) => !/^PG/i.test(key)),
  );
  Object.assign(env, {
    PGPASSWORD: password,
    PGOPTIONS: "-c default_transaction_read_only=on",
    PGSSLMODE: "verify-full",
    PGSSLROOTCERT: "/cert/ca.crt",
    PGCONNECT_TIMEOUT: "10",
  });
  return {
    binary: "docker",
    args: [
      "run",
      "--rm",
      "--pull=never",
      "--read-only",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--memory",
      "256m",
      "--pids-limit",
      "64",
      ...Object.keys(env)
        .filter((key) => /^PG/.test(key))
        .flatMap((key) => ["--env", key]),
      "--mount",
      `type=bind,source=${certificate},target=/cert/ca.crt,readonly`,
      IMAGE,
      "psql",
      "--no-psqlrc",
      "--no-password",
      "-h",
      HOST,
      "-p",
      "5432",
      "-U",
      `postgres.${PROJECT}`,
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      QUERY,
    ],
    options: {
      env,
      encoding: "utf8",
      timeout: 25_000,
      maxBuffer: 64 * 1024,
      windowsHide: true,
    },
  };
}

export async function probeSource(configPath) {
  if (!path.isAbsolute(configPath)) reject("CONFIG_PATH_INVALID");
  const { password } = validateSource(await readFile(configPath, "utf8"));
  const certificate = await readFile(CA);
  if (createHash("sha256").update(certificate).digest("hex") !== CA_HASH)
    reject("CERTIFICATE_MISMATCH");
  const plan = probePlan(password);
  const result = classifyProbe(spawnSync(plan.binary, plan.args, plan.options));
  return {
    kind: "SOURCE_CONNECTIVITY_ONLY_NOT_BACKUP",
    result,
    realDataExported: false,
    backupVerified: false,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (process.argv.length !== 4 || process.argv[2] !== "--config")
      reject("CLI_INVALID");
    const result = await probeSource(process.argv[3]);
    console.log(JSON.stringify(result));
    if (result.result !== "READ_ONLY_TLS_PROBE_PASS") process.exitCode = 1;
  } catch {
    // Never print filesystem exceptions, raw provider errors, URLs or secrets.
    console.log(
      JSON.stringify({
        kind: "SOURCE_CONNECTIVITY_ONLY_NOT_BACKUP",
        result: "SOURCE_PREFLIGHT_REJECTED",
        realDataExported: false,
        backupVerified: false,
      }),
    );
    process.exitCode = 1;
  }
}
