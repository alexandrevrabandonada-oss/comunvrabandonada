import { describe, expect, it } from "vitest";
import {
  isComunStmuMultichannelEnabled,
  shouldCloakComunStmuMultichannel,
} from "./comun-stmu-multichannel-feature";
import {
  latencyBucket,
  STMU_EMAIL_CHANNEL,
  STMU_FIELD_EMAIL,
  validateStmuEmailDestination,
} from "./comun-stmu-multichannel";

const local = {
  ALLOW_LOCAL_TESTS: "true",
  COMUN_BUS_LOCAL_PILOT: "enabled",
  COMUN_RELATA_PREVIEW: "enabled",
  COMUN_RELATA_LOCAL_PERSISTENCE: "enabled",
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  COMUN_FORWARDING_LOCAL: "enabled",
  COMUN_STMU_WHATSAPP_ASSISTED_LOCAL: "enabled",
  COMUN_STMU_MULTICHANNEL_LOCAL: "enabled",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
  SUPABASE_SERVICE_ROLE_KEY: "local-only",
};

describe("STMU multichannel local gate", () => {
  it("requires every local barrier", () => {
    expect(isComunStmuMultichannelEnabled(local)).toBe(true);
    expect(
      isComunStmuMultichannelEnabled({
        ...local,
        COMUN_STMU_MULTICHANNEL_LOCAL: "disabled",
      }),
    ).toBe(false);
    expect(
      shouldCloakComunStmuMultichannel(
        "/api/comun/stmu-multichannel/packages",
        { ...local, COMUN_STMU_MULTICHANNEL_LOCAL: "disabled" },
      ),
    ).toBe(true);
  });
  it("keeps official email exact and field email blocked", () => {
    expect(validateStmuEmailDestination(STMU_EMAIL_CHANNEL.destination)).toBe(
      true,
    );
    expect(
      validateStmuEmailDestination(
        "mailto:stmu@voltaredonda.rj.gov.br?body=secret",
      ),
    ).toBe(false);
    expect(STMU_FIELD_EMAIL.state).toBe("candidate_unverified_blocked");
    expect(latencyBucket(0.5)).toBe("less_than_1_hour");
    expect(latencyBucket(120)).toBe("4_to_7_days");
  });
});
