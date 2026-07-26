import "server-only";

import {
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
  SIDEWALK_OPERATIONAL_RELEASE,
} from "@/lib/sidewalk-operational-release-contract";

export {
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_PAUSED_MESSAGE,
  SIDEWALK_OPERATIONAL_RELEASE,
};

async function readSidewalkOperationalLedger() {
  const connectionString = process.env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL;
  if (!connectionString) return null;

  const { Client } = await import("pg");
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 1_500,
    query_timeout: 1_500,
  });

  try {
    await client.connect();
    const result = await client.query<{
      release: string;
      status: string;
      migration_path: string;
      migration_sha256: string;
    }>(
      `select release, status, migration_path, migration_sha256
       from public.comun_schema_releases
       where release = $1
       limit 1`,
      [SIDEWALK_OPERATIONAL_RELEASE],
    );
    return result.rows[0] ?? null;
  } finally {
    await client.end().catch(() => undefined);
  }
}

/**
 * This check is intentionally fail-closed. The environment flag only permits
 * the ledger lookup; it never enables the feature on its own.
 */
export async function getSidewalkOperationalRelease() {
  if (process.env.COMUN_SIDEWALK_OPERATIONAL_V2 !== "enabled") {
    return { enabled: false as const };
  }

  try {
    const ledger = await readSidewalkOperationalLedger();
    if (!isSidewalkOperationalReleaseEnabled(process.env.COMUN_SIDEWALK_OPERATIONAL_V2, ledger)) {
      return { enabled: false as const };
    }
    return { enabled: true as const };
  } catch (error) {
    if (process.env.COMUN_SIDEWALK_OPERATIONAL_GATE_DIAGNOSTIC === "enabled") {
      const code = typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "unknown";
      console.error(`COMUN_SIDEWALK_OPERATIONAL_GATE_READ_FAILED code=${/^[A-Z0-9_]{1,32}$/.test(code) ? code : "unknown"}`);
    }
    return { enabled: false as const };
  }
}

export async function requireSidewalkOperationalRelease() {
  if (!(await getSidewalkOperationalRelease()).enabled) {
    throw new Error(SIDEWALK_OPERATIONAL_PAUSED_MESSAGE);
  }
}
