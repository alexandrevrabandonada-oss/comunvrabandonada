import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateProviderAvailabilityObservation } from "./provider-availability-observation.mjs";
import {
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

try {
  const observationFile =
    process.env.COMUN_PROVIDER_CAPABILITY_OBSERVATION_FILE;
  const currentObservation = observationFile
    ? validateProviderAvailabilityObservation(
        JSON.parse(await readFile(observationFile, "utf8")),
      )
    : null;
  const checkpoint = await readFile(
    "reports/current/comun-tijolo-47-6a-remote-state-checkpoint.md",
    "utf8",
  );
  assert.match(checkpoint, /plano Free/i);
  await writeEvidence("70-provider-capability.json", {
    result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    observedPlan: currentObservation ? "free" : "not_verified_currently",
    observedFrom: currentObservation
      ? "authenticated_dashboard"
      : "historical_remote_storage_capability_checkpoint",
    currentProviderCapacityVerified: false,
    currentAvailabilityObservation: currentObservation,
    verifiedCapabilityScopes: currentObservation
      ? ["plan", "scheduled_backup_availability", "pitr_availability"]
      : [],
    historicalObservation: {
      plan: "free",
      source: "reports/current/comun-tijolo-47-6a-remote-state-checkpoint.md",
      mergeSha: "6126f2ce2dde3c6f39be91301c86e380027b96f5",
      observedAt: "not_recorded",
      scope: "storage_file_size_limit",
    },
    database: {
      automaticBackups: currentObservation
        ? "unavailable_current_plan"
        : "not_verified_currently",
      pitr: currentObservation
        ? "unavailable_current_plan"
        : "not_verified_currently",
      manualLogicalBackup: "available_on_demand",
      durableRecoveryPointInsideCurrentContract: "not_proven",
    },
    storage: {
      includedInDatabaseBackup: false,
      physicalBackupRequiredSeparately: true,
      durableSecondaryRecoveryCopy: "not_proven",
      rpoMeasured: "on_demand_only",
    },
    auth: {
      providerRecovery: "dashboard_or_provider_capability",
      applicationProfiles: "covered_by_public_schema_backup",
      sessions: "invalidate_and_reauthenticate",
      providerInternalRecoveryPoint: "not_verified_currently",
    },
    rpo: {
      databaseTarget: "24_hours",
      measured: "on_demand_only",
      margin: "none",
      blocker:
        "current_provider_capacity_and_durable_recovery_point_not_proven",
    },
    financialPlanChanged: false,
    sources: [
      "https://supabase.com/docs/guides/platform/backups",
      "https://supabase.com/docs/guides/deployment/going-into-prod",
      "https://supabase.com/pricing",
    ],
  });
  console.log("COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY");
} catch (error) {
  await writeFailureEvidence("provider_capability", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
}
