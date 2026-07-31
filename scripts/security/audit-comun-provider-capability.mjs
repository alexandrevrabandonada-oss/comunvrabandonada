import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  sanitizedError,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

try {
  const checkpoint = await readFile(
    "reports/current/comun-tijolo-47-6a-remote-state-checkpoint.md",
    "utf8",
  );
  assert.match(checkpoint, /plano Free/i);
  await writeEvidence("70-provider-capability.json", {
    result: "COMUN_SECURITY_RESILIENCE_BLOCKED_PROVIDER_CAPABILITY",
    observedPlan: "free",
    observedFrom: "remote_storage_capability_checkpoint",
    database: {
      automaticBackups: "unavailable_on_current_plan",
      pitr: "unavailable_on_current_plan",
      manualLogicalBackup: "available_on_demand",
      durableRecoveryPointInsideCurrentContract: "missing",
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
      providerInternalRecoveryPoint:
        "coupled_to_unavailable_database_backup_capability",
    },
    rpo: {
      databaseTarget: "24_hours",
      measured: "on_demand_only",
      margin: "none",
      blocker: "no_durable_automatic_recovery_point",
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
