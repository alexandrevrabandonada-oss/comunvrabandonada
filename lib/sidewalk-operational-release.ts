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

export type SidewalkOperationalReleaseState =
  | "FLAG_DISABLED"
  | "DATABASE_URL_MISSING"
  | "DATABASE_CONNECTION_FAILED"
  | "LEDGER_ROW_MISSING"
  | "LEDGER_MISMATCH"
  | "OPERATIONAL_READY";

export type SidewalkOperationalDependencies = {
  databaseUrlPresent: boolean;
  databaseReachable: boolean;
  ledgerRowPresent: boolean;
  ledgerExact: boolean;
  status: Exclude<SidewalkOperationalReleaseState, "FLAG_DISABLED">;
};

type LedgerRow = {
  release: string;
  status: string;
  migration_path: string;
  migration_sha256: string;
};

type LedgerClient = {
  connect(): Promise<void>;
  query(
    query: string,
    values: readonly string[],
  ): Promise<{ rows: LedgerRow[] }>;
  end(): Promise<void>;
};

type CreateLedgerClient = (connectionString: string) => Promise<LedgerClient>;

type ReleaseEnvironment = Record<string, string | undefined>;

const ledgerQuery = `select release, status, migration_path, migration_sha256
  from public.comun_schema_releases
  where release = $1
  limit 1`;

async function createLedgerClient(
  connectionString: string,
): Promise<LedgerClient> {
  const { Client } = await import("pg");
  return new Client({
    connectionString,
    connectionTimeoutMillis: 1_500,
    query_timeout: 1_500,
  });
}

function hasConnectionString(env: ReleaseEnvironment) {
  return Boolean(env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL?.trim());
}

export function classifySidewalkOperationalFlag(
  value: string | undefined,
): "enabled" | "disabled" | "missing" {
  if (value === "enabled") return "enabled";
  return value?.trim() ? "disabled" : "missing";
}

/**
 * Reads only the release ledger. Every outcome is deliberately sanitized so it
 * can inform a protected deployment diagnostic without exposing database data.
 */
export async function diagnoseSidewalkOperationalDependencies({
  env = process.env,
  createClient = createLedgerClient,
}: {
  env?: ReleaseEnvironment;
  createClient?: CreateLedgerClient;
} = {}): Promise<SidewalkOperationalDependencies> {
  if (!hasConnectionString(env)) {
    return {
      databaseUrlPresent: false,
      databaseReachable: false,
      ledgerRowPresent: false,
      ledgerExact: false,
      status: "DATABASE_URL_MISSING",
    };
  }

  let client: LedgerClient | undefined;
  try {
    client = await createClient(
      env.COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL!.trim(),
    );
    await client.connect();
    const result = await client.query(ledgerQuery, [
      SIDEWALK_OPERATIONAL_RELEASE,
    ]);
    const ledger = result.rows[0] ?? null;
    if (!ledger) {
      return {
        databaseUrlPresent: true,
        databaseReachable: true,
        ledgerRowPresent: false,
        ledgerExact: false,
        status: "LEDGER_ROW_MISSING",
      };
    }

    if (!hasExactSidewalkOperationalLedger(ledger)) {
      return {
        databaseUrlPresent: true,
        databaseReachable: true,
        ledgerRowPresent: true,
        ledgerExact: false,
        status: "LEDGER_MISMATCH",
      };
    }

    return {
      databaseUrlPresent: true,
      databaseReachable: true,
      ledgerRowPresent: true,
      ledgerExact: true,
      status: "OPERATIONAL_READY",
    };
  } catch {
    return {
      databaseUrlPresent: true,
      databaseReachable: false,
      ledgerRowPresent: false,
      ledgerExact: false,
      status: "DATABASE_CONNECTION_FAILED",
    };
  } finally {
    await client?.end().catch(() => undefined);
  }
}

export async function diagnoseSidewalkOperationalRelease({
  env = process.env,
  dependencies,
  createClient,
}: {
  env?: ReleaseEnvironment;
  dependencies?: SidewalkOperationalDependencies;
  createClient?: CreateLedgerClient;
} = {}): Promise<SidewalkOperationalReleaseState> {
  if (
    classifySidewalkOperationalFlag(env.COMUN_SIDEWALK_OPERATIONAL_V2) !==
    "enabled"
  ) {
    return "FLAG_DISABLED";
  }

  const resolvedDependencies =
    dependencies ??
    (await diagnoseSidewalkOperationalDependencies({ env, createClient }));
  return resolvedDependencies.status;
}

export function isSidewalkOperationalReleaseReady(
  state: SidewalkOperationalReleaseState,
) {
  return state === "OPERATIONAL_READY";
}

/**
 * This check is intentionally fail-closed. The environment flag only permits
 * the ledger lookup; it never enables the feature on its own.
 */
export async function getSidewalkOperationalRelease() {
  return {
    enabled: isSidewalkOperationalReleaseReady(
      await diagnoseSidewalkOperationalRelease(),
    ),
  } as const;
}

export async function requireSidewalkOperationalRelease() {
  if (!(await getSidewalkOperationalRelease()).enabled) {
    throw new Error(SIDEWALK_OPERATIONAL_PAUSED_MESSAGE);
  }
}
