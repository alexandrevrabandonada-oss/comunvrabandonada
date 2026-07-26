import "server-only";

import { cache } from "react";
import {
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
  SIDEWALK_OPERATIONAL_RELEASE,
} from "@/lib/sidewalk-operational-release-contract";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export {
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
  SIDEWALK_OPERATIONAL_RELEASE,
};

/**
 * This check is intentionally fail-closed. The environment flag only permits
 * the ledger lookup; it never enables the feature on its own.
 */
export const getSidewalkOperationalRelease = cache(async () => {
  if (process.env.COMUN_SIDEWALK_OPERATIONAL_V2 !== "enabled") {
    return { enabled: false as const };
  }

  try {
    const db = createServiceSupabaseClient();
    if (!db) return { enabled: false as const };

    const { data, error } = await db
      .from("comun_schema_releases")
      .select("release,status,migration_path,migration_sha256")
      .eq("release", SIDEWALK_OPERATIONAL_RELEASE)
      .maybeSingle();

    if (error || !isSidewalkOperationalReleaseEnabled(process.env.COMUN_SIDEWALK_OPERATIONAL_V2, data)) {
      return { enabled: false as const };
    }
    return { enabled: true as const };
  } catch {
    return { enabled: false as const };
  }
});

export async function requireSidewalkOperationalRelease() {
  if (!(await getSidewalkOperationalRelease()).enabled) {
    throw new Error(SIDEWALK_OPERATIONAL_PAUSED_MESSAGE);
  }
}
