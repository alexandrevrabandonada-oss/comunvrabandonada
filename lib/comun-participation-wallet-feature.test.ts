import { describe, expect, it } from "vitest";
import {
  isComunParticipationWalletEnabled,
  shouldCloakComunParticipationWallet,
} from "./comun-participation-wallet-feature";

const local = {
  COMUN_PARTICIPATION_WALLET_LOCAL: "enabled",
  ALLOW_LOCAL_TESTS: "true",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56431",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-local-only",
};

describe("participation wallet local barrier", () => {
  it("requires all local-only capabilities", () => {
    expect(isComunParticipationWalletEnabled(local)).toBe(true);
    expect(isComunParticipationWalletEnabled({ ...local, ALLOW_LOCAL_TESTS: "false" })).toBe(false);
    expect(isComunParticipationWalletEnabled({ ...local, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })).toBe(false);
    expect(isComunParticipationWalletEnabled({ ...local, SUPABASE_SERVICE_ROLE_KEY: undefined })).toBe(false);
  });

  it("cloaks every wallet endpoint when the flag is off", () => {
    const disabled = { ...local, COMUN_PARTICIPATION_WALLET_LOCAL: "disabled" };
    expect(shouldCloakComunParticipationWallet("/api/comun/participation-wallet", disabled)).toBe(true);
    expect(shouldCloakComunParticipationWallet("/api/comun/participation-wallet/recovery/redeem", disabled)).toBe(true);
    expect(shouldCloakComunParticipationWallet("/api/comun/relata", disabled)).toBe(false);
  });
});
