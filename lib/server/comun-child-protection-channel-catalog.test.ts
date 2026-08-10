import { describe, expect, it } from "vitest";
import { listComunChildProtectionChannels } from "./comun-child-protection-channel-catalog";

describe("COMUN P6C-B2 informational channel catalog", () => {
  it("fails closed on conflicting municipal sources and never enables automation", () => {
    const channels = listComunChildProtectionChannels();
    const council = channels.find((channel) =>
      channel.id.startsWith("vr-conselho-tutelar"),
    );
    expect(council).toMatchObject({
      destination: null,
      sourceStatus: "source_conflict",
      operationalStatus: "operationally_unchecked",
      automationAllowed: false,
    });
    expect(council?.sourceUrls).toHaveLength(2);
    expect(channels.every((channel) => !channel.automationAllowed)).toBe(true);
    expect(
      channels.every(
        (channel) => channel.operationalStatus === "operationally_unchecked",
      ),
    ).toBe(true);
  });
});
