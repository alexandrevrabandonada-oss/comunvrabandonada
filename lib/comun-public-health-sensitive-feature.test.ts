import { describe, expect, it } from "vitest";
import {
  isComunPublicHealthSensitiveRoutingEnabled,
  isComunSensitiveForwardingAssistedEnabled,
} from "./comun-public-health-sensitive-feature";

const production = {
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "configured",
};

describe("COMUN public-health sensitive feature", () => {
  it("requires the explicit flag and the server-side persistence runtime", () => {
    expect(isComunPublicHealthSensitiveRoutingEnabled(production)).toBe(true);
    expect(
      isComunPublicHealthSensitiveRoutingEnabled({
        ...production,
        COMUN_PUBLIC_HEALTH_SENSITIVE_ROUTING_ENABLED: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunPublicHealthSensitiveRoutingEnabled({
        ...production,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }),
    ).toBe(false);
  });

  it("keeps sensitive forwarding disabled in P6C-A", () => {
    expect(
      isComunSensitiveForwardingAssistedEnabled({
        COMUN_SENSITIVE_FORWARDING_ASSISTED_ENABLED: "enabled",
      }),
    ).toBe(false);
  });
});
