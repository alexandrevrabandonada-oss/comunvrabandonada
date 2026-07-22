import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const dbUrlArg = process.argv.find((arg) => arg.startsWith("--db-url="));
const containerArg = process.argv.find((arg) => arg.startsWith("--container="));
const allowRefArg = process.argv.find((arg) => arg.startsWith("--allow-project-ref="));
const dbUrl = dbUrlArg?.slice("--db-url=".length) ?? "postgresql://postgres:postgres@127.0.0.1:56432/postgres";
const hostname = new URL(dbUrl).hostname;
const local = hostname === "127.0.0.1" || hostname === "localhost" || hostname === "host.docker.internal";

if (!local) {
  if (!args.has("--allow-non-local") || !allowRefArg) {
    throw new Error("PR23_RUNNER_REFUSED_NON_LOCAL: use --allow-non-local and --allow-project-ref explicitly");
  }
  const allowed = (process.env.PR23_ALLOWED_PROJECT_REFS ?? "").split(",").filter(Boolean);
  const requested = allowRefArg.slice("--allow-project-ref=".length);
  if (!allowed.includes(requested) || !dbUrl.includes(requested)) throw new Error("PR23_RUNNER_PROJECT_REF_NOT_ALLOWLISTED");
}

const root = path.resolve("supabase/reconciliation/pr23");
if (local && containerArg && !args.has("--force-reconcile")) {
  const container = containerArg.slice("--container=".length);
  const finalCheck = path.join(root, "postflight_assertions.sql");
  const remoteCheck = "/tmp/pr23-final-state-check.sql";
  const copied = spawnSync("docker", ["cp", finalCheck, `${container}:${remoteCheck}`], { encoding: "utf8" });
  if (copied.status === 0) {
    const checked = spawnSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-f", remoteCheck], { encoding: "utf8" });
    if (checked.status === 0) {
      console.log("PR23_RECONCILIATION_ALREADY_RECONCILED");
      process.exit(0);
    }
  }
}
const files = [
  "preflight_assertions.sql",
  ...["02-foundations.sql", "03-pautas-circles.sql", "04-member-profiles-inbox.sql", "05-art-radio.sql", "06-communities.sql", "07-editorial-operation.sql", "08-sidewalks.sql", "09-security-hardening.sql"].map((f) => `modules/${f}`),
  "postflight_assertions.sql",
];

for (const relative of files) {
  const file = path.join(root, relative);
  const source = readFileSync(file, "utf8");
  if (/^\s*TRUNCATE\b|^\s*DROP\s+(TABLE|SCHEMA)\b/im.test(source)) throw new Error(`PR23_RUNNER_DESTRUCTIVE_SQL:${relative}`);
  let result;
  if (local && containerArg) {
    const container = containerArg.slice("--container=".length);
    const remoteFile = `/tmp/pr23-${path.basename(file)}`;
    const copied = spawnSync("docker", ["cp", file, `${container}:${remoteFile}`], { encoding: "utf8" });
    if (copied.status !== 0) throw new Error(`PR23_RUNNER_COPY_FAILED:${relative}`);
    result = spawnSync("docker", ["exec", container, "psql", "-U", "postgres", "-d", "postgres", "-X", "-v", "ON_ERROR_STOP=1", "-f", remoteFile], { encoding: "utf8" });
  } else {
    result = spawnSync("docker", ["run", "--rm", "--network", "host", "-v", `${file}:/work.sql:ro`, "supabase/postgres:15.8.1.085", "psql", dbUrl, "-X", "-v", "ON_ERROR_STOP=1", "-f", "/work.sql"], { encoding: "utf8" });
  }
  if (result.status !== 0) {
    const code = (result.stderr.match(/ERROR:\s+([^\r\n]+)/)?.[1] ?? "unknown").slice(0, 240);
    console.error(`PR23_RECONCILIATION_FAILED object=${relative} error=${code}`);
    process.exit(result.status ?? 1);
  }
  console.log(`PR23_RECONCILIATION_OK object=${relative}`);
}
