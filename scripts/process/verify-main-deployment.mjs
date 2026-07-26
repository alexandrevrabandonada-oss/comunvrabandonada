import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHA_PATTERN = /^[a-f0-9]{40}$/i;

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith("--")) continue;
    const [key, inline] = current.slice(2).split("=", 2);
    const value = inline ?? argv[index + 1];
    if (inline === undefined) index += 1;
    options[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] =
      value;
  }
  return options;
}

export function evaluateMainDeployment({
  eventName,
  environment,
  state,
  sha,
  mainContainsSha,
}) {
  if (eventName !== "deployment_status") {
    return { eligible: false, reason: "event_not_deployment_status" };
  }
  if (environment !== "Production") {
    return { eligible: false, reason: "environment_not_production" };
  }
  if (state !== "success") {
    return { eligible: false, reason: "deployment_not_successful" };
  }
  if (!SHA_PATTERN.test(sha ?? "")) {
    return { eligible: false, reason: "deployment_sha_missing_or_invalid" };
  }
  if (mainContainsSha === "not_found") {
    return { eligible: false, reason: "deployment_sha_not_found" };
  }
  if (mainContainsSha !== true) {
    return { eligible: false, reason: "deployment_sha_not_from_main" };
  }
  return { eligible: true, reason: "main_lineage_confirmed" };
}

function resolveMainLineage(sha, mainRef) {
  if (!SHA_PATTERN.test(sha ?? "")) return false;
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, mainRef], {
      stdio: "ignore",
    });
    return true;
  } catch (error) {
    return error.status === 128 ? "not_found" : false;
  }
}

function writeOutput(target, result) {
  if (!target) return;
  appendFileSync(
    target,
    `eligible=${result.eligible}\nreason=${result.reason}\n`,
  );
}

function writeSummary(target, result) {
  if (!target) return;
  const marker = result.eligible
    ? "COMUN_RETRO_MAIN_LINEAGE_GREEN"
    : "COMUN_RETRO_DEPLOYMENT_NOT_FROM_MAIN";
  appendFileSync(target, `${marker}: ${result.reason}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const sha = options.sha ?? process.env.DEPLOYMENT_SHA;
  const mainRef = options.mainRef ?? "refs/remotes/origin/main";
  const result = evaluateMainDeployment({
    eventName: options.eventName ?? process.env.GITHUB_EVENT_NAME,
    environment: options.environment ?? process.env.DEPLOYMENT_ENVIRONMENT,
    state: options.state ?? process.env.DEPLOYMENT_STATE,
    sha,
    mainContainsSha: resolveMainLineage(sha, mainRef),
  });
  writeOutput(options.githubOutput, result);
  writeSummary(process.env.GITHUB_STEP_SUMMARY, result);
  console.log(
    `${result.eligible ? "COMUN_RETRO_MAIN_LINEAGE_GREEN" : "COMUN_RETRO_DEPLOYMENT_NOT_FROM_MAIN"}:${result.reason}`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
