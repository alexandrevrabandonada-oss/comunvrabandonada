import { describe, expect, it } from "vitest";
import { isComunTerritoryProfileEnabled } from "./comun-territory-profile";

const local = {
  NODE_ENV: "test",
  ALLOW_LOCAL_TESTS: "true",
  COMUN_TERRITORY_CATALOG_LOCAL: "enabled",
};

describe("territory profile capability", () => {
  it("is off for the production candidate by default", () => {
    expect(isComunTerritoryProfileEnabled({ NODE_ENV: "production" })).toBe(
      false,
    );
    expect(
      isComunTerritoryProfileEnabled({
        ...local,
        COMUN_TERRITORY_CATALOG_LOCAL: "disabled",
        COMUN_TERRITORY_PROFILE_ENABLED: "disabled",
      }),
    ).toBe(false);
  });

  it("allows the explicit promoted capability", () => {
    expect(
      isComunTerritoryProfileEnabled({
        NODE_ENV: "production",
        COMUN_TERRITORY_PROFILE_ENABLED: "enabled",
      }),
    ).toBe(true);
  });

  it("keeps the legacy alias local-only", () => {
    expect(isComunTerritoryProfileEnabled(local)).toBe(true);
    expect(
      isComunTerritoryProfileEnabled({ ...local, ALLOW_LOCAL_TESTS: "false" }),
    ).toBe(false);
    expect(
      isComunTerritoryProfileEnabled({ ...local, NODE_ENV: "production" }),
    ).toBe(false);
  });
});
