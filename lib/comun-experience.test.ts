import { describe, expect, it } from "vitest";
import {
  isComunAppV2,
  canonicalComunHref,
  resolveComunExperience,
  shouldUseLegacyDefault,
  withComunAppV2,
  withComunExperience,
} from "./comun-experience";

describe("COMUN experience contract", () => {
  it("uses App V2 by default and preserves the explicit legacy rollback", () => {
    expect(resolveComunExperience("app-v2")).toBe("app-v2");
    expect(resolveComunExperience(["app-v2", "legacy"])).toBe("app-v2");
    expect(isComunAppV2(new URLSearchParams("experiencia=app-v2"))).toBe(true);
    expect(resolveComunExperience("v2")).toBe("app-v2");
    expect(resolveComunExperience(undefined)).toBe("app-v2");
    expect(resolveComunExperience("legacy")).toBe("legacy");
    expect(resolveComunExperience("coerencia")).toBe("legacy");
    expect(isComunAppV2("coerencia")).toBe(false);
  });

  it("preserves query and hash while emitting canonical V2 links", () => {
    expect(withComunAppV2("/comun/explorar?q=rio#resultados")).toBe(
      "/comun/explorar?q=rio#resultados",
    );
    expect(withComunAppV2("https://example.com/comun")).toBe(
      "https://example.com/comun",
    );
  });

  it("emits an explicit legacy flag without losing other state", () => {
    expect(
      withComunExperience(
        "/comun/pautas?experiencia=app-v2&filtro=aberta",
        "legacy",
      ),
    ).toBe("/comun/pautas?experiencia=legacy&filtro=aberta");
    expect(withComunAppV2("/comun/pautas?filtro=aberta", false)).toBe(
      "/comun/pautas?filtro=aberta&experiencia=legacy",
    );
  });

  it("builds a query-free canonical URL for compatibility variants", () => {
    expect(
      canonicalComunHref("/comun/explorar?q=rio&experiencia=legacy#resultados"),
    ).toBe("/comun/explorar?q=rio#resultados");
  });

  it("activates the server rollback only for an absent explicit choice", () => {
    expect(shouldUseLegacyDefault("legacy", null)).toBe(true);
    expect(shouldUseLegacyDefault("legacy", "app-v2")).toBe(false);
    expect(shouldUseLegacyDefault("legacy", "legacy")).toBe(false);
    expect(shouldUseLegacyDefault("app-v2", null)).toBe(false);
    expect(shouldUseLegacyDefault("invalid", null)).toBe(false);
  });
});
