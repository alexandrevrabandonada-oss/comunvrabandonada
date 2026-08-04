import { describe, expect, it } from "vitest";
import {
  isFiscalizaAssistedOpeningEnabled,
  isComunForwardingEnabled,
  shouldCloakComunForwarding,
} from "./comun-forwarding-feature";

const local = {
  COMUN_FORWARDING_LOCAL: "enabled",
  ALLOW_LOCAL_TESTS: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55431",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic",
};

describe("forwarding local barrier", () => {
  it("requires local loopback and service role", () => {
    expect(isComunForwardingEnabled(local)).toBe(true);
    expect(
      isComunForwardingEnabled({
        ...local,
        COMUN_FORWARDING_LOCAL: "disabled",
      }),
    ).toBe(false);
    expect(
      isComunForwardingEnabled({
        ...local,
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBe(false);
  });
  it("cloaks every forwarding path while disabled", () => {
    expect(
      shouldCloakComunForwarding("/api/comun/forwarding/packages", {
        ...local,
        COMUN_FORWARDING_LOCAL: "disabled",
      }),
    ).toBe(true);
    expect(shouldCloakComunForwarding("/api/comun/relata", local)).toBe(false);
  });
  it("requires the separate assisted-opening barrier", () => {
    expect(isFiscalizaAssistedOpeningEnabled(local)).toBe(false);
    expect(
      isFiscalizaAssistedOpeningEnabled({
        ...local,
        COMUN_FISCALIZA_ASSISTED_OPENING_LOCAL: "enabled",
      }),
    ).toBe(true);
  });
});
