import { describe, expect, it } from "vitest";
import type { ComunOperationalRole } from "./types";
import { canAccessOperationalSurface } from "./operational-authorization";
const p = (operational_role: ComunOperationalRole | null, active = true) => ({
  role: "viewer" as const,
  operational_role,
  active,
});
describe("autorização operacional server-side", () => {
  it("cobre as capacidades positivas do ciclo de calçadas", () => {
    expect(canAccessOperationalSurface(p("facilitator"), "circle")).toBe(true);
    expect(
      canAccessOperationalSurface(p("protocol_operator"), "protocol"),
    ).toBe(true);
    expect(canAccessOperationalSurface(p("result_editor"), "result")).toBe(
      true,
    );
    expect(canAccessOperationalSurface(p("archive_curator"), "archive")).toBe(
      true,
    );
    expect(
      canAccessOperationalSurface(
        { role: "admin", operational_role: null, active: true },
        "audit",
      ),
    ).toBe(true);
  });

  it("fecha perfis sem capacidade", () => {
    // Visitante e participante não possuem perfil administrativo operacional.
    expect(canAccessOperationalSurface(p(null), "central")).toBe(false);
    expect(canAccessOperationalSurface(p(null), "protocol")).toBe(false);
    expect(canAccessOperationalSurface(p("privacy_reviewer"), "rights")).toBe(
      false,
    );
    expect(canAccessOperationalSurface(p("protocol_operator"), "archive")).toBe(
      false,
    );
    expect(canAccessOperationalSurface(p("facilitator"), "protocol")).toBe(
      false,
    );
    expect(canAccessOperationalSurface(p("result_editor"), "audit")).toBe(
      false,
    );
    expect(
      canAccessOperationalSurface(p("archive_curator"), "assignment"),
    ).toBe(false);
  });
  it("nega suspenso", () =>
    expect(
      canAccessOperationalSurface(p("operations_admin", false), "central"),
    ).toBe(false));
  it("não eleva por atribuição", () =>
    expect(canAccessOperationalSurface(p("facilitator"), "assignment")).toBe(
      false,
    ));
});
