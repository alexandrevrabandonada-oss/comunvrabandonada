import { describe, expect, it } from "vitest";
import {
  COMUN_INSTITUTIONAL_CHANNEL_CATALOG,
  findInstitutionalChannel,
  listInstitutionalChannels,
} from "./comun-institutional-channel-catalog";

describe("institutional channel catalog", () => {
  it("keeps destinations in the server catalog with official sources", () => {
    expect(listInstitutionalChannels("water_supply")[0]?.institution).toBe(
      "SAAE Volta Redonda",
    );
    expect(listInstitutionalChannels("power_distribution").length).toBe(2);
    expect(listInstitutionalChannels("public_lighting").length).toBe(2);
    for (const channel of COMUN_INSTITUTIONAL_CHANNEL_CATALOG) {
      expect(channel.sourceStatus).toBe("source_verified");
      expect(channel.automationAllowed).toBe(false);
      expect(channel.sourceUrl.startsWith("https://")).toBe(true);
    }
  });

  it("does not accept a channel from another canonical category", () => {
    expect(
      findInstitutionalChannel("water_supply", "light-agencia-virtual"),
    ).toBeUndefined();
  });
});
