import { describe, expect, it } from "vitest";
import {
  COLLECTIVE_ACTIONS_MIGRATION_PATH,
  COLLECTIVE_ACTIONS_MIGRATION_SHA256,
  COLLECTIVE_ACTIONS_RELEASE,
  hasExactCollectiveActionsLedger,
  isCollectiveActionsPreviewFixturesEnabled,
  isCollectiveActionsReleaseEnabled,
} from "./collective-actions-release-contract";

describe("collective actions release gate", () => {
  const exact = {
    release: COLLECTIVE_ACTIONS_RELEASE,
    status: "applied",
    migration_path: COLLECTIVE_ACTIONS_MIGRATION_PATH,
    migration_sha256: COLLECTIVE_ACTIONS_MIGRATION_SHA256,
  };
  it("fails closed when the flag, ledger and tables are absent", () => {
    expect(
      isCollectiveActionsReleaseEnabled(undefined, null, false, false),
    ).toBe(false);
    expect(
      isCollectiveActionsReleaseEnabled("enabled", null, false, false),
    ).toBe(false);
  });
  it("accepts a complete foundation only when the member journey guard is present", () => {
    expect(hasExactCollectiveActionsLedger(exact)).toBe(true);
    expect(
      isCollectiveActionsReleaseEnabled("enabled", exact, false, true),
    ).toBe(true);
    expect(isCollectiveActionsReleaseEnabled("enabled", null, true, true)).toBe(
      true,
    );
    expect(
      isCollectiveActionsReleaseEnabled("enabled", exact, false, false),
    ).toBe(false);
  });
  it("permits preview fixtures only in preview", () => {
    expect(
      isCollectiveActionsPreviewFixturesEnabled({
        VERCEL_ENV: "preview",
        COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES: "enabled",
      }),
    ).toBe(true);
    expect(
      isCollectiveActionsPreviewFixturesEnabled({
        VERCEL_ENV: "production",
        COMUN_COLLECTIVE_ACTIONS_PREVIEW_FIXTURES: "enabled",
      }),
    ).toBe(false);
  });
});
