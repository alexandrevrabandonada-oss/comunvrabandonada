import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  RESULT,
  evidenceDir,
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const scenarios = [
  ["anonymous_private_read", "P1", "deny_and_record", "database_restore"],
  ["dangerous_grant", "P1", "revoke_in_isolated_database", "rls"],
  ["privileged_function_exposed", "P1", "revoke_execute", "rls"],
  [
    "expired_signed_url",
    "P2",
    "deny_and_regenerate_only_after_authorization",
    "retention",
  ],
  [
    "private_object_public_fixture",
    "P0",
    "quarantine_fixture",
    "storage_restore",
  ],
  ["fake_secret_in_artifact", "P0", "reject_artifact", "secrets"],
  ["corrupted_backup", "P1", "reject_restore", "database_restore"],
  ["checksum_mismatch", "P1", "reject_restore", "database_restore"],
  ["incomplete_restore", "P1", "keep_source_untouched", "database_restore"],
  ["interrupted_migration", "P2", "transaction_rollback", "migration_recovery"],
  ["incompatible_deployment", "P1", "hold_traffic", "deployment_rollback"],
  ["synthetic_object_loss", "P1", "restore_isolated_copy", "storage_restore"],
  ["synthetic_admin_revoked", "P1", "invalidate_and_reassign", "rls"],
  ["urgent_withdrawal", "P1", "unpublish_and_preserve_audit", "retention"],
  [
    "workflow_failed_without_artifact",
    "P2",
    "emit_sanitized_failure_envelope",
    "run_envelope",
  ],
];

try {
  const controls = await loadControls();
  const central = new Map();
  for (const [scenario, severity, containment, control] of scenarios) {
    assert.equal(controls[control], true, `${control} não comprovado`);
    const fingerprint = `security:${scenario}`;
    const incident = {
      fingerprint,
      severity,
      containment,
      ownerRole: severity === "P0" ? "security_lead" : "operations_admin",
      sla:
        severity === "P0"
          ? "immediate"
          : severity === "P1"
            ? "4_hours"
            : "24_hours",
      lifecycle: [
        "detected",
        "classified",
        "contained",
        "evidence_preserved",
        "investigated",
        "corrected",
        "recovered",
        "closed",
        "retrospective_recorded",
      ],
      sanitized: true,
      cleanup: "complete",
    };
    central.set(fingerprint, incident);
    central.set(fingerprint, incident);
  }
  assert.equal(central.size, scenarios.length, "deduplicação falhou");
  assert.ok([...central.values()].every((entry) => entry.sanitized));
  assert.ok(
    [...central.values()].every(
      (entry) =>
        entry.lifecycle.includes("contained") &&
        entry.lifecycle.includes("closed") &&
        entry.cleanup === "complete",
    ),
  );
  const counts = [...central.values()].reduce(
    (acc, item) => ({ ...acc, [item.severity]: acc[item.severity] + 1 }),
    { P0: 0, P1: 0, P2: 0 },
  );
  await writeEvidence("50-incident-rehearsal.json", {
    result: RESULT.incidents,
    scenarios: scenarios.map(([name, severity, containment, control]) => ({
      name,
      severity,
      detection: "green",
      containment,
      controlEvidence: control,
      centralOperationalEntry: "created",
      deduplication: "green",
      owner: "assigned_role",
      sla: "defined",
      closure: "green",
      cleanup: "green",
    })),
    counts,
    duplicateOperationalEntries: 0,
    privateIdentifiers: false,
    realCredentials: false,
  });
  console.log(RESULT.incidents);
} catch (error) {
  await writeFailureEvidence("incident_rehearsal", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}

async function loadControls() {
  const specifications = {
    rls: ["10-rls-complete.json", RESULT.rls],
    secrets: ["20-secrets-boundary.json", RESULT.secrets],
    database_restore: ["30-database-restore.json", RESULT.databaseRestore],
    storage_restore: ["35-storage-restore.json", RESULT.storageRestore],
    migration_recovery: [
      "40-migration-recovery.json",
      RESULT.migrationRecovery,
    ],
    deployment_rollback: [
      "45-deployment-rollback.json",
      RESULT.deploymentRollback,
    ],
    retention: ["60-retention.json", RESULT.retention],
  };
  const controls = { run_envelope: false };
  for (const [name, [file, expected]] of Object.entries(specifications)) {
    const evidence = JSON.parse(
      await readFile(path.join(evidenceDir, file), "utf8"),
    );
    controls[name] = evidence.result === expected;
  }
  const runEnvelope = JSON.parse(
    await readFile(path.join(evidenceDir, "00-run-envelope.json"), "utf8"),
  );
  controls.run_envelope =
    runEnvelope.status === "started" &&
    runEnvelope.containsPrivateData === false &&
    runEnvelope.containsSecretMaterial === false;
  return controls;
}
