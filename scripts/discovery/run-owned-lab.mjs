import { execFileSync, spawnSync } from "node:child_process";
import { assertOwnedRunner, assertLabDestination } from "./lab-guard.mjs";
function command(bin, args) {
  try {
    return execFileSync(bin, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 900000,
    });
  } catch {
    throw Error(`DISCOVERY_LAB_COMMAND_FAILED:${bin}:${args[0]}`);
  }
}
const endpoint = command("docker", [
  "context",
  "inspect",
  "--format",
  "{{.Endpoints.docker.Host}}",
]).trim();
assertOwnedRunner(process.env, endpoint, command("docker", ["ps", "-aq"]));
let started = false;
try {
  started = true;
  command("supabase", [
    "start",
    "-x",
    "studio,imgproxy,edge-runtime,logflare,vector,supavisor",
  ]);
  const status = JSON.parse(command("supabase", ["status", "-o", "json"]));
  const container = JSON.parse(
    command("docker", ["inspect", "supabase_db_COMUM_VR_ABANDONADA"]),
  )[0];
  assertLabDestination(status, container);
  const child = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "tests/public-discovery/real-lab.integration.test.ts",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        COMUN_DISCOVERY_VERIFIED_LAB: "LOOPBACK_OWNED",
        COMUN_DISCOVERY_API: status.API_URL,
        COMUN_DISCOVERY_DB: status.DB_URL,
        COMUN_DISCOVERY_ANON: status.ANON_KEY,
        COMUN_DISCOVERY_SERVICE: status.SERVICE_ROLE_KEY,
      },
      timeout: 180000,
    },
  );
  if (child.status !== 0) throw Error("DISCOVERY_REAL_LAB_PROOF_FAILED");
} finally {
  if (started) command("supabase", ["stop", "--no-backup"]);
}
