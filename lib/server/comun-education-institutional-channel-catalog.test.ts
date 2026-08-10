import { describe, expect, it } from "vitest";
import { listComunEducationInstitutionalChannels } from "./comun-education-institutional-channel-catalog";

describe("COMUN P6C-B1 official education channel catalog", () => {
  it("is informational, server-side and never automation-enabled", () => {
    const channels = listComunEducationInstitutionalChannels();
    expect(channels.length).toBeGreaterThanOrEqual(5);
    expect(
      channels.every((channel) => channel.sourceStatus === "source_verified"),
    ).toBe(true);
    expect(
      channels.every(
        (channel) => channel.operationalStatus === "operationally_unchecked",
      ),
    ).toBe(true);
    expect(
      channels.every((channel) => channel.automationAllowed === false),
    ).toBe(true);
  });

  it("reserves protection channels for child-safety signals", () => {
    const channels = listComunEducationInstitutionalChannels();
    expect(
      channels
        .filter((channel) => channel.protectionOnly)
        .map((channel) => channel.institution),
    ).toEqual(
      expect.arrayContaining([
        "Conselhos Tutelares I e II de Volta Redonda",
        "Disque Direitos Humanos — Disque 100",
        "SAMU 192",
      ]),
    );
    expect(
      channels
        .filter((channel) => !channel.protectionOnly)
        .every((channel) => ["municipal", "state"].includes(channel.sphere)),
    ).toBe(true);
  });
});
