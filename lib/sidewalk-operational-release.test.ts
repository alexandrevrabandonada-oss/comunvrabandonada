import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  classifySidewalkOperationalFlag,
  diagnoseSidewalkOperationalDependencies,
  diagnoseSidewalkOperationalRelease,
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseReady,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_RELEASE,
} from "./sidewalk-operational-release";

const exactLedger = {
  release: SIDEWALK_OPERATIONAL_RELEASE,
  status: "applied",
  migration_path: SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  migration_sha256: SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
};

const enabledEnvironment = {
  COMUN_SIDEWALK_OPERATIONAL_V2: "enabled",
  COMUN_SIDEWALK_OPERATIONAL_DATABASE_URL: "postgresql://diagnostic-only",
};

function ledgerClient(
  row: typeof exactLedger | undefined,
  { connectError = false } = {},
) {
  return async () => ({
    async connect() {
      if (connectError) throw new Error("connection failed");
    },
    async query() {
      return { rows: row === undefined ? [] : [row] };
    },
    async end() {},
  });
}

describe("sidewalk operational release gate", () => {
  it("keeps the feature disabled without the explicit flag", () => {
    expect(isSidewalkOperationalReleaseEnabled("disabled", exactLedger)).toBe(
      false,
    );
  });

  it("blocks when the ledger is absent", () => {
    expect(hasExactSidewalkOperationalLedger(null)).toBe(false);
  });

  it("blocks a divergent ledger", () => {
    expect(
      hasExactSidewalkOperationalLedger({
        ...exactLedger,
        migration_sha256: "0".repeat(64),
      }),
    ).toBe(false);
  });

  it("enables only the exact applied ledger", () => {
    expect(hasExactSidewalkOperationalLedger(exactLedger)).toBe(true);
    expect(isSidewalkOperationalReleaseEnabled("enabled", exactLedger)).toBe(
      true,
    );
  });

  it("keeps the public gate fail-closed when the flag is disabled or missing", async () => {
    expect(classifySidewalkOperationalFlag(undefined)).toBe("missing");
    expect(classifySidewalkOperationalFlag("disabled")).toBe("disabled");
    expect(
      await diagnoseSidewalkOperationalRelease({
        env: { COMUN_SIDEWALK_OPERATIONAL_V2: "disabled" },
      }),
    ).toBe("FLAG_DISABLED");
    expect(isSidewalkOperationalReleaseReady("FLAG_DISABLED")).toBe(false);
  });

  it("classifies a missing database URL without attempting a connection", async () => {
    let created = false;
    const dependencies = await diagnoseSidewalkOperationalDependencies({
      env: { COMUN_SIDEWALK_OPERATIONAL_V2: "enabled" },
      createClient: async () => {
        created = true;
        return ledgerClient(exactLedger)();
      },
    });
    expect(created).toBe(false);
    expect(dependencies).toMatchObject({
      databaseUrlPresent: false,
      databaseReachable: false,
      status: "DATABASE_URL_MISSING",
    });
    expect(
      await diagnoseSidewalkOperationalRelease({
        env: { COMUN_SIDEWALK_OPERATIONAL_V2: "enabled" },
        dependencies,
      }),
    ).toBe("DATABASE_URL_MISSING");
  });

  it("classifies a database connection failure without exposing its error", async () => {
    const dependencies = await diagnoseSidewalkOperationalDependencies({
      env: enabledEnvironment,
      createClient: ledgerClient(undefined, { connectError: true }),
    });
    expect(dependencies).toEqual({
      databaseUrlPresent: true,
      databaseReachable: false,
      ledgerRowPresent: false,
      ledgerExact: false,
      status: "DATABASE_CONNECTION_FAILED",
    });
  });

  it("distinguishes a missing ledger row from a mismatched ledger row", async () => {
    const missing = await diagnoseSidewalkOperationalDependencies({
      env: enabledEnvironment,
      createClient: ledgerClient(undefined),
    });
    const mismatch = await diagnoseSidewalkOperationalDependencies({
      env: enabledEnvironment,
      createClient: ledgerClient({
        ...exactLedger,
        migration_sha256: "f".repeat(64),
      }),
    });
    expect(missing.status).toBe("LEDGER_ROW_MISSING");
    expect(mismatch.status).toBe("LEDGER_MISMATCH");
  });

  it("returns OPERATIONAL_READY only for an enabled flag and exact readable ledger", async () => {
    const dependencies = await diagnoseSidewalkOperationalDependencies({
      env: enabledEnvironment,
      createClient: ledgerClient(exactLedger),
    });
    const state = await diagnoseSidewalkOperationalRelease({
      env: enabledEnvironment,
      dependencies,
    });
    expect(state).toBe("OPERATIONAL_READY");
    expect(isSidewalkOperationalReleaseReady(state)).toBe(true);
  });
});
