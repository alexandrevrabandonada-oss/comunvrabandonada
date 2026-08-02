import { describe, expect, it } from "vitest";
import {
  isComunAppV2,
  resolveComunExperience,
  withComunAppV2,
  withComunExperience,
} from "./comun-experience";

describe("COMUN experience contract", () => {
  it("accepts app-v2 only from the canonical query value", () => {
    expect(resolveComunExperience("app-v2")).toBe("app-v2");
    expect(resolveComunExperience(["app-v2", "legacy"])).toBe("app-v2");
    expect(isComunAppV2(new URLSearchParams("experiencia=app-v2"))).toBe(true);
    expect(resolveComunExperience("v2")).toBe("legacy");
    expect(resolveComunExperience(undefined)).toBe("legacy");
  });

  it("preserves query and hash while enabling the reversible pilot", () => {
    expect(withComunAppV2("/comun/explorar?q=rio#resultados")).toBe(
      "/comun/explorar?q=rio&experiencia=app-v2#resultados",
    );
    expect(withComunAppV2("https://example.com/comun")).toBe(
      "https://example.com/comun",
    );
  });

  it("removes only the experience flag on legacy fallback", () => {
    expect(
      withComunExperience(
        "/comun/pautas?experiencia=app-v2&filtro=aberta",
        "legacy",
      ),
    ).toBe("/comun/pautas?filtro=aberta");
  });
});
