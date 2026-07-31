import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  RESULT,
  evidenceDir,
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const remote = process.argv.includes("--remote");
const required = [
  ["10-rls-complete.json", RESULT.rls],
  ["20-secrets-boundary.json", RESULT.secrets],
  ["30-database-restore.json", RESULT.databaseRestore],
  ["35-storage-restore.json", RESULT.storageRestore],
  ["40-migration-recovery.json", RESULT.migrationRecovery],
  ["45-deployment-rollback.json", RESULT.deploymentRollback],
  ["50-incident-rehearsal.json", RESULT.incidents],
  ["60-retention.json", RESULT.retention],
];

try {
  const checks = [];
  const evidenceByFile = new Map();
  for (const [file, expected] of required) {
    const body = JSON.parse(
      await readFile(path.join(evidenceDir, file), "utf8"),
    );
    evidenceByFile.set(file, body);
    checks.push({
      evidence: file.replace(/^\d+-/, "").replace(/\.json$/, ""),
      expected,
      actual: body.result,
      green: body.result === expected,
    });
  }
  const allGreen = checks.every((check) => check.green);
  let providerCapability;
  try {
    providerCapability = JSON.parse(
      await readFile(
        path.join(evidenceDir, "70-provider-capability.json"),
        "utf8",
      ),
    );
  } catch {}
  const providerBlocked =
    providerCapability?.result ===
    "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY";
  const databaseEvidence = evidenceByFile.get("30-database-restore.json");
  const storageEvidence = evidenceByFile.get("35-storage-restore.json");
  const result = providerBlocked
    ? "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY"
    : allGreen
      ? remote
        ? RESULT.green
        : RESULT.ready
      : "COMUN_SECURITY_RESILIENCE_BLOCKED_INCOMPLETE_EVIDENCE";
  await writeEvidence("99-security-resilience.json", {
    domain: "security_resilience",
    result,
    checks,
    evidenceScope: remote ? "remote_and_isolated" : "local_implementation",
    remoteBackup:
      remote && allGreen
        ? providerBlocked
          ? "ephemeral_verified_but_no_durable_recovery_point"
          : "verified"
        : "pending",
    isolatedDatabaseRestore: remote && allGreen ? "verified" : "pending",
    isolatedStorageRestore: remote && allGreen ? "verified" : "pending",
    rpoRto: [
      {
        surface: "database_rpo",
        target: "24_hours",
        measured: remote
          ? "ephemeral_snapshot_at_run"
          : "local_synthetic_snapshot",
        margin: providerBlocked ? "none" : "within_target_if_scheduled",
        blocker: providerBlocked
          ? "durable_recovery_point_unavailable_on_current_plan"
          : "none",
      },
      {
        surface: "storage_rpo",
        target: "24_hours",
        measured: storageEvidence?.rpoRto?.storageRpoObserved || "not_measured",
        margin: remote ? "on_demand_only" : "not_remote",
        blocker: remote ? "durable_secondary_copy_not_proven" : "remote_run",
      },
      {
        surface: "public_reading_rto",
        target: "60_minutes",
        measured:
          databaseEvidence?.restore?.applicationSmoke?.measured
            ?.publicReading || "not_measured",
        margin: remote && allGreen ? "within_target" : "pending",
        blocker: "none_if_previous_ready_deployment_is_compatible",
      },
      {
        surface: "authentication_rto",
        target: "4_hours",
        measured:
          databaseEvidence?.restore?.applicationSmoke?.measured
            ?.authentication || "not_measured",
        margin: remote && allGreen ? "within_target" : "pending",
        blocker: "provider_auth_recovery_not_exercised",
      },
      {
        surface: "contribution_rto",
        target: "4_hours",
        measured:
          databaseEvidence?.restore?.applicationSmoke?.measured?.contribution ||
          "not_measured",
        margin: remote && allGreen ? "within_target" : "pending",
        blocker: "none_in_isolated_application",
      },
      {
        surface: "administration_rto",
        target: "4_hours",
        measured:
          databaseEvidence?.restore?.applicationSmoke?.measured
            ?.administration || "not_measured",
        margin: remote && allGreen ? "within_target" : "pending",
        blocker: "requires_independent_substitute_identity",
      },
      {
        surface: "full_recovery_rto",
        target: "8_hours",
        measured:
          databaseEvidence?.rpoRto?.fullRecoveryRtoMeasured || "not_measured",
        margin: remote && allGreen ? "within_target" : "pending",
        blocker: providerBlocked ? "durable_source_backup_missing" : "none",
      },
    ],
    launchPublicly: "not_invoked",
    roadmap: [
      "47.8 — Segurança, privacidade e recuperação",
      "47.9A — Coerência de experiência, arquitetura de informação e direção UI/UX",
      "47.9B — Acessibilidade, PWA, performance e matriz de dispositivos",
      "47.10 — Conteúdo, ajuda e governança",
      "47.11 — Ensaio geral, estabilidade e go/no-go",
    ],
  });
  console.log(result);
  if (!allGreen) process.exitCode = 1;
} catch (error) {
  await writeFailureEvidence("aggregate", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
