import { describe, expect, it } from "vitest";
import {
  applyComunEssentialServicesRoutingGate,
  isComunEssentialForwardingAssistedEnabled,
  isComunEssentialServicesEnabled,
  shouldCloakComunEssentialServices,
} from "./comun-essential-services-feature";
import { routeRelata } from "./comun-relata-routing";

const local = {
  COMUN_ESSENTIAL_SERVICES_ENABLED: "enabled",
  COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  ALLOW_LOCAL_TESTS: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_SERVICE_ROLE_KEY: "local-test-key",
};

describe("essential services cumulative gates", () => {
  it("separates classification from assisted forwarding", () => {
    expect(isComunEssentialServicesEnabled(local)).toBe(true);
    expect(isComunEssentialForwardingAssistedEnabled(local)).toBe(true);
    expect(
      isComunEssentialForwardingAssistedEnabled({
        ...local,
        COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED: "disabled",
      }),
    ).toBe(false);
  });

  it("gates only the new water classification", () => {
    const water = routeRelata({ text: "Estamos sem água desde ontem" });
    expect(applyComunEssentialServicesRoutingGate(water, false).category).toBe(
      "other",
    );
    expect(
      applyComunEssentialServicesRoutingGate(
        { ...water, category: "power_distribution" },
        false,
      ).category,
    ).toBe("power_distribution");
  });

  it("cloaks disabled endpoints", () => {
    expect(
      shouldCloakComunEssentialServices(
        "/api/comun/essential-services/packages/x",
        local,
      ),
    ).toBe(false);
    expect(
      shouldCloakComunEssentialServices(
        "/api/comun/essential-services/packages/x",
        {
          ...local,
          COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED: "disabled",
        },
      ),
    ).toBe(true);
    expect(
      shouldCloakComunEssentialServices("/api/comun/relata/classification", {
        ...local,
        COMUN_ESSENTIAL_FORWARDING_ASSISTED_ENABLED: "disabled",
      }),
    ).toBe(false);
  });
});
