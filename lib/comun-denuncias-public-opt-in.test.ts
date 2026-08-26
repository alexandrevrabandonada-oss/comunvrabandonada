import { describe, expect, it } from "vitest";
import {
  COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES,
  isComunPublicProjectionOptInCategory,
} from "./comun-denuncias-public-opt-in";

describe("public projection opt-in", () => {
  it("keeps the Production opt-in allowlist narrow and explicit", () => {
    expect(COMUN_PUBLIC_PROJECTION_OPT_IN_CATEGORIES).toEqual([
      "public_lighting",
      "power_distribution",
      "smoke_or_environmental_trace",
    ]);
    expect(isComunPublicProjectionOptInCategory("public_health")).toBe(false);
    expect(isComunPublicProjectionOptInCategory("active_fire")).toBe(false);
    expect(isComunPublicProjectionOptInCategory("child_protection")).toBe(false);
  });
});
