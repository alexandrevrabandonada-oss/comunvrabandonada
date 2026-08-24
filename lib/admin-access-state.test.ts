import { describe, expect, it } from "vitest";
import { resolveComunAdminAccessKind } from "./admin-access-state";

describe("estado de acesso administrativo", () => {
  it("distingue ausência de sessão", () => {
    expect(
      resolveComunAdminAccessKind({ hasUser: false, hasActiveAdmin: false }),
    ).toBe("signed_out");
  });

  it("não promove uma conta comunitária autenticada", () => {
    expect(
      resolveComunAdminAccessKind({ hasUser: true, hasActiveAdmin: false }),
    ).toBe("authenticated_not_authorized");
  });

  it("autoriza somente registro administrativo ativo", () => {
    expect(
      resolveComunAdminAccessKind({ hasUser: true, hasActiveAdmin: true }),
    ).toBe("authorized");
  });
});
