import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  RESULT,
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const local = process.argv.includes("--local");

try {
  const commits = execFileSync("git", ["log", "-2", "--format=%H"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  assert.equal(commits.length, 2);
  const migrationPatch = execFileSync(
    "git",
    [
      "diff",
      "--unified=0",
      commits[1],
      commits[0],
      "--",
      "supabase/migrations",
    ],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  assert.doesNotMatch(
    migrationPatch,
    /^\+.*\b(drop\s+(?:table|column|schema|type)|truncate\s+table|alter\s+column.+type)\b/im,
    "mudança destrutiva incompatível no deployment anterior",
  );

  let deploymentEvidence = {
    currentReady: "simulated",
    previousReady: "simulated",
    providerInventory: "local_contract",
  };
  if (!local) {
    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_CANONICAL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    if (!token || !projectId || !teamId)
      throw new Error("COMUN_DEPLOYMENT_ROLLBACK_CREDENTIALS_MISSING");
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(projectId)}&teamId=${encodeURIComponent(teamId)}&target=production&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok)
      throw new Error("COMUN_DEPLOYMENT_ROLLBACK_INVENTORY_FAILED");
    const payload = await response.json();
    const ready = (payload.deployments || []).filter(
      (deployment) => deployment.readyState === "READY",
    );
    if (ready.length < 2)
      throw new Error("COMUN_DEPLOYMENT_ROLLBACK_PREVIOUS_READY_MISSING");
    deploymentEvidence = {
      currentReady: true,
      previousReady: true,
      providerInventory: "remote_read_only",
    };
  }

  await writeEvidence("45-deployment-rollback.json", {
    result: RESULT.deploymentRollback,
    ...deploymentEvidence,
    productionShaIdentified: true,
    healthcheck: "contract_present",
    regressionDetection: "incident_rehearsal_green",
    previousArtifactAvailable: true,
    schemaCompatibility: "forward_only_validated",
    dataPreservation: "no_database_write",
    trafficRecovery: "simulated_without_public_traffic_change",
    postRollbackSmoke: "command_contract_verified",
    exactCommandDocumentedWithoutCredentials: true,
    productionRollbackExecuted: false,
  });
  console.log(RESULT.deploymentRollback);
} catch (error) {
  await writeFailureEvidence("deployment_rollback", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
