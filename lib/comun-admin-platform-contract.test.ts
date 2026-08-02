import { describe, expect, it } from "vitest";
import {
  COMUN_ADMIN_PLATFORM_GATES,
  COMUN_ADMIN_PLATFORM_ROUTES,
  resolveComunAdminPlatformRoute,
  sanitizeComunPlatformTelemetry,
} from "./comun-admin-platform-contract";
import {
  OPERATIONAL_SURFACES,
  operationalSurfaceActionHref,
} from "./operational-surfaces";

describe("contrato canônico da administração sistêmica", () => {
  it("classifica as doze rotas da Onda 4 sem combinação de shell incoerente", () => {
    expect(COMUN_ADMIN_PLATFORM_ROUTES).toHaveLength(12);
    expect(
      new Set(COMUN_ADMIN_PLATFORM_ROUTES.map(({ route }) => route)).size,
    ).toBe(12);
    for (const route of COMUN_ADMIN_PLATFORM_ROUTES) {
      expect(route.memberBottomNavigation).toBe(false);
      expect(route.preservesAppV2Flag).toBe(true);
      expect(route.publicDataOnly).toBe(false);
    }
    expect(
      resolveComunAdminPlatformRoute(
        "/comun/admin/operacao/superficies/incidents?experiencia=app-v2",
      )?.shell,
    ).toBe("operational_level_0");
    expect(
      resolveComunAdminPlatformRoute(
        "/comun/admin/operacao/8be16ca7-5c75-4b3e-b93c-925e24fd7d38",
      )?.preservesFilters,
    ).toBe(true);
  });

  it("mantém blockers reais e o lançamento atrás do gate humano", () => {
    expect(COMUN_ADMIN_PLATFORM_GATES.launch).toEqual({
      gate: "launch_publicly",
      state: "human_gate_closed",
      mayTriggerWithoutHuman: false,
    });
    expect(
      COMUN_ADMIN_PLATFORM_GATES.civicIntelligence.semanticPromotionAllowed,
    ).toBe(false);
    expect(COMUN_ADMIN_PLATFORM_GATES.durableRecovery.promotionAllowed).toBe(
      false,
    );
  });

  it("dá próxima ação navegável a todo estado operacional", () => {
    for (const surface of OPERATIONAL_SURFACES) {
      const href = operationalSurfaceActionHref(surface.key);
      expect(href).toMatch(/^\/comun\/admin(?:\/|\?|$)/);
      expect(href).not.toContain("launch_publicly");
    }
  });

  it("remove consulta, pessoa, segredo, conteúdo e localização da telemetria", () => {
    expect(
      sanitizeComunPlatformTelemetry({
        count: 4,
        status: "blocked",
        raw_query: "select * from private",
        email: "pessoa@example.test",
        nested: { signed_url: "https://private", latency_p95_ms: 320 },
        latitude: -22.5,
      }),
    ).toEqual({ count: 4, status: "blocked", nested: { latency_p95_ms: 320 } });
  });
});
