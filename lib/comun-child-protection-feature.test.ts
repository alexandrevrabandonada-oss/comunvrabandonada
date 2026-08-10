import { describe, expect, it } from "vitest";
import { isComunChildProtectionPrivateRoutingEnabled } from "./comun-child-protection-feature";

describe("COMUN P6C-B2 child protection feature", () => {
  it("requires the explicit flag and canonical persistence", () => {
    expect(isComunChildProtectionPrivateRoutingEnabled({})).toBe(false);
    expect(
      isComunChildProtectionPrivateRoutingEnabled({
        COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED: "enabled",
      }),
    ).toBe(false);
    expect(
      isComunChildProtectionPrivateRoutingEnabled({
        COMUN_CHILD_PROTECTION_PRIVATE_ROUTING_ENABLED: "enabled",
        COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      }),
    ).toBe(true);
  });
});
