import { describe, expect, it } from "vitest";
import { isComunPublicEducationSensitiveRoutingEnabled } from "./comun-public-education-sensitive-feature";

const base = {
  COMUN_RELATA_PERSISTENCE_ENABLED: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-present",
};

describe("COMUN P6C-B1 feature flag", () => {
  it("requires explicit education routing and canonical persistence", () => {
    expect(
      isComunPublicEducationSensitiveRoutingEnabled({
        ...base,
        COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED: "enabled",
      }),
    ).toBe(true);
    expect(isComunPublicEducationSensitiveRoutingEnabled(base)).toBe(false);
    expect(
      isComunPublicEducationSensitiveRoutingEnabled({
        COMUN_PUBLIC_EDUCATION_SENSITIVE_ROUTING_ENABLED: "enabled",
      }),
    ).toBe(false);
  });
});
