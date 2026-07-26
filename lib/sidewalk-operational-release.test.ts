import { describe, expect, it } from "vitest";
import {
  hasExactSidewalkOperationalLedger,
  isSidewalkOperationalReleaseEnabled,
  SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
  SIDEWALK_OPERATIONAL_RELEASE,
} from "./sidewalk-operational-release-contract";

const exactLedger = {
  release: SIDEWALK_OPERATIONAL_RELEASE,
  status: "applied",
  migration_path: SIDEWALK_OPERATIONAL_MIGRATION_PATH,
  migration_sha256: SIDEWALK_OPERATIONAL_MIGRATION_SHA256,
};

describe("sidewalk operational release gate", () => {
  it("keeps the feature disabled without the explicit flag", () => {
    expect(isSidewalkOperationalReleaseEnabled("disabled", exactLedger)).toBe(false);
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
    expect(isSidewalkOperationalReleaseEnabled("enabled", exactLedger)).toBe(true);
  });
});
